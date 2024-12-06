import { AmountMath } from '@agoric/ertp';
import { assertAllDefined, makeTracer } from '@agoric/internal';
import { AnyNatAmountShape, ChainAddressShape } from '@agoric/orchestration';
import { pickFacet } from '@agoric/vat-data';
import { VowShape } from '@agoric/vow';
import { q } from '@endo/errors';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import {
  CctpTxEvidenceShape,
  EudParamShape,
  EvmHashShape,
} from '../type-guards.js';
import { addressTools } from '../utils/address.js';
import { makeFeeTools } from '../utils/fees.js';

/**
 * @import {HostInterface} from '@agoric/async-flow';
 * @import {TypedPattern} from '@agoric/internal'
 * @import {NatAmount} from '@agoric/ertp';
 * @import {ChainAddress, ChainHub, Denom, OrchestrationAccount} from '@agoric/orchestration';
 * @import {ZoeTools} from '@agoric/orchestration/src/utils/zoe-tools.js';
 * @import {VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {CctpTxEvidence, EvmHash, FeeConfig, LogFn, NobleAddress} from '../types.js';
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

/** @type {TypedPattern<AdvancerVowCtx>} */
const AdvancerVowCtxShape = M.splitRecord(
  {
    fullAmount: AnyNatAmountShape,
    advanceAmount: AnyNatAmountShape,
    destination: ChainAddressShape,
    forwardingAddress: M.string(),
    txHash: EvmHashShape,
  },
  { tmpSeat: M.remotable() },
);

/** type guards internal to the AdvancerKit */
const AdvancerKitI = harden({
  advancer: M.interface('AdvancerI', {
    handleTransactionEvent: M.callWhen(CctpTxEvidenceShape).returns(),
  }),
  depositHandler: M.interface('DepositHandlerI', {
    onFulfilled: M.call(M.undefined(), AdvancerVowCtxShape).returns(VowShape),
    onRejected: M.call(M.error(), AdvancerVowCtxShape).returns(),
  }),
  transferHandler: M.interface('TransferHandlerI', {
    // TODO confirm undefined, and not bigint (sequence)
    onFulfilled: M.call(M.undefined(), AdvancerVowCtxShape).returns(
      M.undefined(),
    ),
    onRejected: M.call(M.error(), AdvancerVowCtxShape).returns(M.undefined()),
  }),
});

/**
 * @typedef {{
 *  fullAmount: NatAmount;
 *  advanceAmount: NatAmount;
 *  destination: ChainAddress;
 *  forwardingAddress: NobleAddress;
 *  txHash: EvmHash;
 * }} AdvancerVowCtx
 */

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
     *   notifyFacet: import('./settler.js').SettlerKit['notify'];
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
            if (statusManager.hasBeenObserved(evidence)) {
              log('txHash already seen:', evidence.txHash);
              return;
            }

            const { borrowerFacet, poolAccount } = this.state;
            const { recipientAddress } = evidence.aux;
            // throws if EUD is not found
            const { EUD } = addressTools.getQueryParams(
              recipientAddress,
              EudParamShape,
            );
            // throws if the bech32 prefix is not found
            const destination = chainHub.makeChainAddress(EUD);

            const fullAmount = toAmount(evidence.tx.amount);
            // throws if requested does not exceed fees
            const advanceAmount = feeTools.calculateAdvance(fullAmount);

            const { zcfSeat: tmpSeat } = zcf.makeEmptySeatKit();
            const amountKWR = harden({ USDC: advanceAmount });
            // throws if the pool has insufficient funds
            borrowerFacet.borrow(tmpSeat, amountKWR);

            // this cannot throw since `.isSeen()` is called in the same turn
            statusManager.advance(evidence);

            const depositV = localTransfer(
              tmpSeat,
              // @ts-expect-error LocalAccountMethods vs OrchestrationAccount
              poolAccount,
              amountKWR,
            );
            void watch(depositV, this.facets.depositHandler, {
              fullAmount,
              advanceAmount,
              destination,
              forwardingAddress: evidence.tx.forwardingAddress,
              tmpSeat,
              txHash: evidence.txHash,
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
         * @param {AdvancerVowCtx & { tmpSeat: ZCFSeat }} ctx
         */
        onFulfilled(result, ctx) {
          const { poolAccount } = this.state;
          const { destination, advanceAmount, ...detail } = ctx;
          const transferV = E(poolAccount).transfer(destination, {
            denom: usdc.denom,
            value: advanceAmount.value,
          });
          return watch(transferV, this.facets.transferHandler, {
            destination,
            advanceAmount,
            ...detail,
          });
        },
        /**
         * @param {Error} error
         * @param {AdvancerVowCtx & { tmpSeat: ZCFSeat }} ctx
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
         * @param {unknown} result TODO confirm this is not a bigint (sequence)
         * @param {AdvancerVowCtx} ctx
         */
        onFulfilled(result, ctx) {
          const { notifyFacet } = this.state;
          const { advanceAmount, destination, ...detail } = ctx;
          log(
            'Advance transfer fulfilled',
            q({ advanceAmount, destination, result }).toString(),
          );
          // During development, due to a bug, this call threw.
          // The failure was silent (no diagnostics) due to:
          //  - #10576 Vows do not report unhandled rejections
          // For now, the advancer kit relies on consistency between
          // notifyFacet, statusManager, and callers of handleTransactionEvent().
          // TODO: revisit #10576 during #10510
          notifyFacet.notifyAdvancingResult({ destination, ...detail }, true);
        },
        /**
         * @param {Error} error
         * @param {AdvancerVowCtx} ctx
         */
        onRejected(error, ctx) {
          const { notifyFacet } = this.state;
          log('Advance transfer rejected', q(error).toString());
          notifyFacet.notifyAdvancingResult(ctx, false);
        },
      },
    },
    {
      stateShape: harden({
        notifyFacet: M.remotable(),
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
