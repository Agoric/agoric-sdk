import { AmountMath, AmountShape } from '@agoric/ertp';
import { assertAllDefined, makeTracer } from '@agoric/internal';
import { ChainAddressShape } from '@agoric/orchestration';
import { pickFacet } from '@agoric/vat-data';
import { VowShape } from '@agoric/vow';
import { q } from '@endo/errors';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { CctpTxEvidenceShape, EudParamShape } from '../type-guards.js';
import { addressTools } from '../utils/address.js';
import { makeFeeTools } from '../utils/fees.js';

const { isGTE } = AmountMath;

/**
 * @import {HostInterface} from '@agoric/async-flow';
 * @import {NatAmount} from '@agoric/ertp';
 * @import {ChainAddress, ChainHub, Denom, OrchestrationAccount} from '@agoric/orchestration';
 * @import {ZoeTools} from '@agoric/orchestration/src/utils/zoe-tools.js';
 * @import {VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {CctpTxEvidence, FeeConfig, LogFn} from '../types.js';
 * @import {StatusManager} from './status-manager.js';
 * @import {LiquidityPoolKit} from './liquidity-pool.js';
 */

/**
 * @typedef {{
 *  chainHub: ChainHub;
 *  feeConfig: FeeConfig;
 *  localTransfer: ZoeTools['localTransfer'];
 *  log?: LogFn;
 *  statusManager: StatusManager;
 *  usdc: { brand: Brand<'nat'>; denom: Denom; };
 *  vowTools: VowTools;
 *  zcf: ZCF;
 * }} AdvancerKitPowers
 */

/** type guards internal to the AdvancerKit */
const AdvancerKitI = harden({
  advancer: M.interface('AdvancerI', {
    handleTransactionEvent: M.callWhen(CctpTxEvidenceShape).returns(),
  }),
  depositHandler: M.interface('DepositHandlerI', {
    onFulfilled: M.call(M.undefined(), {
      amount: AmountShape,
      destination: ChainAddressShape,
      tmpSeat: M.remotable(),
    }).returns(VowShape),
    onRejected: M.call(M.error(), {
      amount: AmountShape,
      destination: ChainAddressShape,
      tmpSeat: M.remotable(),
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
  {
    chainHub,
    feeConfig,
    localTransfer,
    log = makeTracer('Advancer', true),
    statusManager,
    usdc,
    vowTools: { watch, when },
    zcf,
  } = /** @type {AdvancerKitPowers} */ ({}),
) => {
  assertAllDefined({
    chainHub,
    feeConfig,
    statusManager,
    watch,
    when,
  });
  const feeTools = makeFeeTools(feeConfig);
  /** @param {bigint} value */
  const toAmount = value => AmountMath.make(usdc.brand, value);

  return zone.exoClassKit(
    'Fast USDC Advancer',
    AdvancerKitI,
    /**
     * @param {{
     *   borrowerFacet: LiquidityPoolKit['borrower'];
     *   poolAccount: HostInterface<OrchestrationAccount<{chainId: 'agoric'}>>;
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
            const { borrowerFacet, poolAccount } = this.state;
            const { recipientAddress } = evidence.aux;
            const { EUD } = addressTools.getQueryParams(
              recipientAddress,
              EudParamShape,
            );

            // this will throw if the bech32 prefix is not found, but is handled by the catch
            const destination = chainHub.makeChainAddress(EUD);
            const requestedAmount = toAmount(evidence.tx.amount);
            const advanceAmount = feeTools.calculateAdvance(requestedAmount);

            // TODO: consider skipping and using `borrow()`s internal balance check
            const poolBalance = borrowerFacet.getBalance();
            if (!isGTE(poolBalance, requestedAmount)) {
              log(
                `Insufficient pool funds`,
                `Requested ${q(advanceAmount)} but only have ${q(poolBalance)}`,
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

            const { zcfSeat: tmpSeat } = zcf.makeEmptySeatKit();
            const amountKWR = harden({ USDC: advanceAmount });
            try {
              borrowerFacet.borrow(tmpSeat, amountKWR);
            } catch (e) {
              // We do not expect this to fail since there are no turn boundaries
              // between .getBalance() and .borrow().
              // We catch to report outside of the normal error flow since this is
              // not expected.
              log('🚨 advance borrow failed', q(e).toString());
            }

            const depositV = localTransfer(
              tmpSeat,
              // @ts-expect-error LocalAccountMethods vs OrchestrationAccount
              poolAccount,
              amountKWR,
            );
            void watch(depositV, this.facets.depositHandler, {
              amount: advanceAmount,
              destination,
              tmpSeat,
            });
          } catch (e) {
            log('Advancer error:', q(e).toString());
            statusManager.observe(evidence);
          }
        },
      },
      depositHandler: {
        /**
         * @param {undefined} result
         * @param {{ amount: Amount<'nat'>; destination: ChainAddress; tmpSeat: ZCFSeat }} ctx
         */
        onFulfilled(result, { amount, destination }) {
          const { poolAccount } = this.state;
          const transferV = E(poolAccount).transfer(destination, {
            denom: usdc.denom,
            value: amount.value,
          });
          return watch(transferV, this.facets.transferHandler, {
            destination,
            amount,
          });
        },
        /**
         * @param {Error} error
         * @param {{ amount: Amount<'nat'>; destination: ChainAddress; tmpSeat: ZCFSeat }} ctx
         */
        onRejected(error, { tmpSeat }) {
          // TODO return seat allocation from ctx to LP?
          log('🚨 advance deposit failed', q(error).toString());
          // TODO #10510 (comprehensive error testing) determine
          // course of action here
          log(
            'TODO live payment on seat to return to LP',
            q(tmpSeat).toString(),
          );
        },
      },
      transferHandler: {
        /**
         * @param {undefined} result TODO confirm this is not a bigint (sequence)
         * @param {{ destination: ChainAddress; amount: NatAmount; }} ctx
         */
        onFulfilled(result, { destination, amount }) {
          // TODO vstorage update? We don't currently have a status for
          // Advanced + transferV settled
          log(
            'Advance transfer fulfilled',
            q({ amount, destination, result }).toString(),
          );
        },
        onRejected(error) {
          // TODO #10510 (comprehensive error testing) determine
          // course of action here. This might fail due to timeout.
          log('Advance transfer rejected', q(error).toString());
        },
      },
    },
    {
      stateShape: harden({
        borrowerFacet: M.remotable(),
        poolAccount: M.remotable(),
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
