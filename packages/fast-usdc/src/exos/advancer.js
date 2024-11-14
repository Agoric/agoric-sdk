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
 * @import {TransactionFeedKit} from './transaction-feed.js';
 */

/**
 * @param {Zone} zone
 * @param {object} caps
 * @param {ChainHub} caps.chainHub
 * @param {LogFn} caps.log
 * @param {StatusManager} caps.statusManager
 * @param {VowTools} caps.vowTools
 */
export const prepareAdvancer = (
  zone,
  { chainHub, log, statusManager, vowTools: { watch } },
) => {
  assertAllDefined({ statusManager, watch });

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
      handleTransactionEvent: M.call(CctpTxEvidenceShape).returns(VowShape),
    }),
    /**
     * @param {{
     *   localDenom: Denom;
     *   poolAccount: HostInterface<OrchestrationAccount<{ chainId: 'agoric' }>>;
     * }} config
     */
    config => harden(config),
    {
      /** @param {CctpTxEvidence} evidence */
      handleTransactionEvent(evidence) {
        // TODO EventFeed will perform input validation checks.
        const { recipientAddress } = evidence.aux;
        const { EUD } = addressTools.getQueryParams(recipientAddress).params;
        if (!EUD) {
          statusManager.observe(evidence);
          throw makeError(
            `recipientAddress does not contain EUD param: ${q(recipientAddress)}`,
          );
        }

        // TODO #10391 this can throw, and should make a status update in the catch
        const destination = chainHub.makeChainAddress(EUD);

        /** @type {DenomAmount} */
        const requestedAmount = harden({
          denom: this.state.localDenom,
          value: BigInt(evidence.tx.amount),
        });

        // TODO #10391 ensure there's enough funds in poolAccount

        const transferV = E(this.state.poolAccount).transfer(
          destination,
          requestedAmount,
        );

        // mark as Advanced since `transferV` initiates the advance
        statusManager.advance(evidence);

        return watch(transferV, transferHandler, {
          destination,
          amount: requestedAmount.value,
        });
      },
    },
    {
      stateShape: harden({
        localDenom: M.string(),
        poolAccount: M.remotable(),
      }),
    },
  );
};
harden(prepareAdvancer);
