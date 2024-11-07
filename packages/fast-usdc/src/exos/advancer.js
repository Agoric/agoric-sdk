import { AmountMath, BrandShape } from '@agoric/ertp';
import { assertAllDefined } from '@agoric/internal';
import { ChainAddressShape } from '@agoric/orchestration';
import { VowShape } from '@agoric/vow';
import { makeError, q } from '@endo/errors';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { CctpTxEvidenceShape } from '../typeGuards.js';
import { addressTools } from '../utils/address.js';

/**
 * @import {HostInterface} from '@agoric/async-flow';
 * @import {ChainAddress, ChainHub, Denom, DenomAmount, OrchestrationAccount} from '@agoric/orchestration';
 * @import {VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {CctpTxEvidence, LogFn} from '../types.js';
 * @import {StatusManager} from './status-manager.js';
 * @import {TransactionFeed} from './transaction-feed.js';
 */

/**
 * @param {Zone} zone
 * @param {object} caps
 * @param {ChainHub} caps.chainHub
 * @param {TransactionFeed} caps.feed
 * @param {LogFn} caps.log
 * @param {StatusManager} caps.statusManager
 * @param {VowTools} caps.vowTools
 */
export const prepareAdvancer = (
  zone,
  { chainHub, feed, log, statusManager, vowTools: { watch, when } },
) => {
  assertAllDefined({ feed, statusManager, watch });

  const transferHandler = zone.exo(
    'Fast USDC Advance Transfer Handler',
    M.interface('TransferHandlerI', {
      // TODO confirm undefined, and not bigint (sequence)
      onFulfilled: M.call(M.undefined(), {
        amount: M.bigint(),
        destination: ChainAddressShape,
      }).returns(M.undefined()),
      onRejected: M.call(M.error(), {
        amount: M.bigint(),
        destination: ChainAddressShape,
      }).returns(M.undefined()),
    }),
    {
      /**
       * @param {undefined} result TODO confirm this is not a bigint (sequence)
       * @param {{ destination: ChainAddress; amount: bigint; }} ctx
       */
      onFulfilled(result, { destination, amount }) {
        // TODO vstorage update?
        log(
          'Advance transfer fulfilled',
          q({ amount, destination, result }).toString(),
        );
      },
      onRejected(error) {
        // XXX retry logic?
        // What do we do if we fail, should we keep a Status?
        log('Advance transfer rejected', q(error).toString());
      },
    },
  );

  return zone.exoClass(
    'Fast USDC Advancer',
    M.interface('AdvancerI', {
      handleTransactionEvent: M.callWhen(CctpTxEvidenceShape).returns(
        M.or(M.undefined(), VowShape),
      ),
    }),
    /**
     * @param {{
     *   localDenom: Denom;
     *   poolAccount: HostInterface<OrchestrationAccount<{ chainId: 'agoric' }>>;
     *   usdcBrand: Brand<'nat'>;
     * }} config
     */
    config => harden(config),
    {
      /**
       * Returns a Promise for a Vow , since we we `await vt.when()`the
       * `poolAccount.getBalance()` call. `getBalance()` interfaces with
       * `BankManager` and `ChainHub`, so we can expect the calls to resolve
       * promptly. We also don't care how many time `.getBalance` is called,
       * and watched vows are not dependent on its result.
       *
       * This also might return `undefined` (unwrapped) if precondition checks
       * fail.
       *
       * We do not expect any callers to depend on the settlement of
       * `handleTransactionEvent` - errors caught are communicated to the
       * `StatusManager` - so we don't need to concern ourselves with
       * preserving the vow chain for callers.
       *
       * @param {CctpTxEvidence} evidence
       */
      async handleTransactionEvent(evidence) {
        await null;
        try {
          const { recipientAddress } = evidence.aux;
          const { EUD } = addressTools.getQueryParams(recipientAddress).params;
          if (!EUD) {
            throw makeError(
              `recipientAddress does not contain EUD param: ${q(recipientAddress)}`,
            );
          }

          // this will throw if the bech32 prefix is not found, but is handled by the catch
          const destination = chainHub.makeChainAddress(EUD);

          /** @type {DenomAmount} */
          const requestedAmount = harden({
            denom: this.state.localDenom,
            value: BigInt(evidence.tx.amount),
          });
          /**
           * Ensure there's enough funds in poolAccount.
           *
           * It's safe to await here since we don't care how many
           * times we call `getBalance`. Our later Vow call - `transferV` and
           * its ctx - are also not reliant on the consistency of this value.
           */
          const poolBalance = await when(
            E(this.state.poolAccount).getBalance(this.state.localDenom),
          );

          if (
            !AmountMath.isGTE(
              AmountMath.make(this.state.usdcBrand, poolBalance.value),
              AmountMath.make(this.state.usdcBrand, requestedAmount.value),
            )
          ) {
            log(
              `Insufficient pool funds`,
              `Requested ${q(requestedAmount)} but only have ${q(poolBalance)}`,
            );
            statusManager.observe(evidence);
            return;
          }

          try {
            // mark as Advanced since `transferV` initiates the advance
            // will throw if we've already .skipped or .advanced this evidence
            statusManager.advance(evidence);
          } catch (e) {
            // only anticipated error is `assertNotSeen`, so
            // intercept the catch so we don't call .skip which
            // also performs this check
            log('Advancer error:', q(e).toString());
            return;
          }

          const transferV = E(this.state.poolAccount).transfer(
            destination,
            requestedAmount,
          );

          return watch(transferV, transferHandler, {
            destination,
            amount: requestedAmount.value,
          });
        } catch (e) {
          log(`Advancer error:`, q(e).toString());
          statusManager.observe(evidence);
        }
      },
    },
    {
      stateShape: harden({
        localDenom: M.string(),
        poolAccount: M.remotable(),
        usdcBrand: BrandShape,
      }),
    },
  );
};
harden(prepareAdvancer);
