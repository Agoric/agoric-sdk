import { AmountMath, AmountShape, PaymentShape } from '@agoric/ertp';
import { assertAllDefined } from '@agoric/internal';
import { ChainAddressShape } from '@agoric/orchestration';
import { pickFacet } from '@agoric/vat-data';
import { VowShape } from '@agoric/vow';
import { makeError, q } from '@endo/errors';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { CctpTxEvidenceShape } from '../typeGuards.js';
import { addressTools } from '../utils/address.js';

const { isGTE } = AmountMath;

/**
 * @import {HostInterface} from '@agoric/async-flow';
 * @import {NatAmount} from '@agoric/ertp';
 * @import {ChainAddress, ChainHub, Denom, DenomAmount, OrchestrationAccount} from '@agoric/orchestration';
 * @import {VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {CctpTxEvidence, LogFn} from '../types.js';
 * @import {StatusManager} from './status-manager.js';
 */

/**
 * Expected interface from LiquidityPool
 *
 * @typedef {{
 *   lookupBalance(): NatAmount;
 *   borrow(amount: Amount<"nat">): Promise<Payment<"nat">>;
 *   repay(payments: PaymentKeywordRecord): Promise<void>
 * }} AssetManagerFacet
 */

/**
 * @typedef {{
 *  chainHub: ChainHub;
 *  log: LogFn;
 *  statusManager: StatusManager;
 *  usdc: { brand: Brand<'nat'>; denom: Denom; };
 *  vowTools: VowTools;
 * }} AdvancerKitPowers
 */

/** type guards internal to the AdvancerKit */
const AdvancerKitI = harden({
  advancer: M.interface('AdvancerI', {
    handleTransactionEvent: M.callWhen(CctpTxEvidenceShape).returns(),
  }),
  depositHandler: M.interface('DepositHandlerI', {
    onFulfilled: M.call(AmountShape, {
      destination: ChainAddressShape,
      payment: PaymentShape,
    }).returns(VowShape),
    onRejected: M.call(M.error(), {
      destination: ChainAddressShape,
      payment: PaymentShape,
    }).returns(),
  }),
  transferHandler: M.interface('TransferHandlerI', {
    // TODO confirm undefined, and not bigint (sequence)
    onFulfilled: M.call(M.undefined(), {
      amount: AmountShape,
      destination: ChainAddressShape,
    }).returns(M.undefined()),
    onRejected: M.call(M.error(), {
      amount: AmountShape,
      destination: ChainAddressShape,
    }).returns(M.undefined()),
  }),
});

/**
 * @param {Zone} zone
 * @param {AdvancerKitPowers} caps
 */
export const prepareAdvancerKit = (
  zone,
  { chainHub, log, statusManager, usdc, vowTools: { watch, when } },
) => {
  assertAllDefined({
    chainHub,
    statusManager,
    watch,
    when,
  });

  /** @param {bigint} value */
  const toAmount = value => AmountMath.make(usdc.brand, value);

  return zone.exoClassKit(
    'Fast USDC Advancer',
    AdvancerKitI,
    /**
     * @param {{
     *   assetManagerFacet: AssetManagerFacet;
     *   poolAccount: ERef<HostInterface<OrchestrationAccount<{chainId: 'agoric'}>>>;
     * }} config
     */
    config => harden(config),
    {
      advancer: {
        /**
         * Must perform a status update for every observed transaction.
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
            // TODO poolAccount might be a vow we need to unwrap
            const { assetManagerFacet, poolAccount } = this.state;
            const { recipientAddress } = evidence.aux;
            const { EUD } =
              addressTools.getQueryParams(recipientAddress).params;
            if (!EUD) {
              throw makeError(
                `recipientAddress does not contain EUD param: ${q(recipientAddress)}`,
              );
            }

            // this will throw if the bech32 prefix is not found, but is handled by the catch
            const destination = chainHub.makeChainAddress(EUD);
            const requestedAmount = toAmount(evidence.tx.amount);

            // TODO: consider skipping and using `borrow()`s internal balance check
            const poolBalance = assetManagerFacet.lookupBalance();
            if (!isGTE(poolBalance, requestedAmount)) {
              log(
                `Insufficient pool funds`,
                `Requested ${q(requestedAmount)} but only have ${q(poolBalance)}`,
              );
              statusManager.observe(evidence);
              return;
            }

            try {
              // Mark as Advanced since `transferV` initiates the advance.
              // Will throw if we've already .skipped or .advanced this evidence.
              statusManager.advance(evidence);
            } catch (e) {
              // Only anticipated error is `assertNotSeen`, so intercept the
              // catch so we don't call .skip which also performs this check
              log('Advancer error:', q(e).toString());
              return;
            }

            try {
              const payment = await assetManagerFacet.borrow(requestedAmount);
              const depositV = E(poolAccount).deposit(payment);
              void watch(depositV, this.facets.depositHandler, {
                destination,
                payment,
              });
            } catch (e) {
              // `.borrow()` might fail if the balance changes since we
              // requested it. TODO - how to handle this? change ADVANCED -> OBSERVED?
              // Note: `depositHandler` handles the `.deposit()` failure
              log('🚨 advance borrow failed', q(e).toString());
            }
          } catch (e) {
            log('Advancer error:', q(e).toString());
            statusManager.observe(evidence);
          }
        },
      },
      depositHandler: {
        /**
         * @param {NatAmount} amount amount returned from deposit
         * @param {{ destination: ChainAddress; payment: Payment<'nat'> }} ctx
         */
        onFulfilled(amount, { destination }) {
          const { poolAccount } = this.state;
          const transferV = E(poolAccount).transfer(
            destination,
            /** @type {DenomAmount} */ ({
              denom: usdc.denom,
              value: amount.value,
            }),
          );
          return watch(transferV, this.facets.transferHandler, {
            destination,
            amount,
          });
        },
        /**
         * @param {Error} error
         * @param {{ destination: ChainAddress; payment: Payment<'nat'> }} ctx
         */
        onRejected(error, { payment }) {
          // TODO return live payment from ctx to LP
          log('🚨 advance deposit failed', q(error).toString());
          log('TODO live payment to return to LP', q(payment).toString());
        },
      },
      transferHandler: {
        /**
         * @param {undefined} result TODO confirm this is not a bigint (sequence)
         * @param {{ destination: ChainAddress; amount: NatAmount; }} ctx
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
    },
    {
      stateShape: harden({
        assetManagerFacet: M.remotable(),
        poolAccount: M.or(VowShape, M.remotable()),
      }),
    },
  );
};
harden(prepareAdvancerKit);

/**
 * @param {Zone} zone
 * @param {AdvancerKitPowers} caps
 */
export const prepareAdvancer = (zone, caps) => {
  const makeAdvancerKit = prepareAdvancerKit(zone, caps);
  return pickFacet(makeAdvancerKit, 'advancer');
};
harden(prepareAdvancer);
