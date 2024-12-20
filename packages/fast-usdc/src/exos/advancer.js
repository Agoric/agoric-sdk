import { decodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import { AmountMath } from '@agoric/ertp';
import { assertAllDefined, makeTracer } from '@agoric/internal';
import { AnyNatAmountShape, ChainAddressShape } from '@agoric/orchestration';
import { pickFacet } from '@agoric/vat-data';
import { VowShape } from '@agoric/vow';
import { E } from '@endo/far';
import { M, mustMatch } from '@endo/patterns';
import { Fail, q } from '@endo/errors';
import {
  AddressHookShape,
  EvmHashShape,
  EvidenceWithRiskShape,
} from '../type-guards.js';
import { makeFeeTools } from '../utils/fees.js';

/**
 * @import {HostInterface} from '@agoric/async-flow';
 * @import {TypedPattern} from '@agoric/internal'
 * @import {NatAmount} from '@agoric/ertp';
 * @import {ChainAddress, ChainHub, Denom, OrchestrationAccount} from '@agoric/orchestration';
 * @import {ZoeTools} from '@agoric/orchestration/src/utils/zoe-tools.js';
 * @import {VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {CctpTxEvidence, AddressHook, EvmHash, FeeConfig, LogFn, NobleAddress, EvidenceWithRisk} from '../types.js';
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
    handleTransactionEvent: M.callWhen(EvidenceWithRiskShape).returns(),
    setIntermediateRecipient: M.call(ChainAddressShape).returns(),
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
  },
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
     *   settlementAddress: ChainAddress;
     *   intermediateRecipient?: ChainAddress;
     * }} config
     */
    config =>
      harden({
        ...config,
        // make sure the state record has this property, perhaps with an undefined value
        intermediateRecipient: config.intermediateRecipient,
      }),
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
         * @param {EvidenceWithRisk} evidenceWithRisk
         */
        async handleTransactionEvent({ evidence, risk }) {
          await null;
          try {
            if (statusManager.hasBeenObserved(evidence)) {
              log('txHash already seen:', evidence.txHash);
              return;
            }

            if (risk.risksIdentified?.length) {
              log('risks identified, skipping advance');
              statusManager.skipAdvance(evidence, risk.risksIdentified);
              return;
            }

            const { borrowerFacet, poolAccount, settlementAddress } =
              this.state;
            const { recipientAddress } = evidence.aux;
            const decoded = decodeAddressHook(recipientAddress);
            mustMatch(decoded, AddressHookShape);
            if (decoded.baseAddress !== settlementAddress.value) {
              throw Fail`⚠️ baseAddress of address hook ${q(decoded.baseAddress)} does not match the expected address ${q(settlementAddress.value)}`;
            }
            const { EUD } = /** @type {AddressHook['query']} */ (decoded.query);
            log(`decoded EUD: ${EUD}`);
            // throws if the bech32 prefix is not found
            const destination = chainHub.makeChainAddress(EUD);

            const fullAmount = toAmount(evidence.tx.amount);
            // throws if requested does not exceed fees
            const advanceAmount = feeTools.calculateAdvance(fullAmount);

            const { zcfSeat: tmpSeat } = zcf.makeEmptySeatKit();
            // throws if the pool has insufficient funds
            borrowerFacet.borrow(tmpSeat, advanceAmount);

            // this cannot throw since `.isSeen()` is called in the same turn
            statusManager.advance(evidence);

            const depositV = localTransfer(
              tmpSeat,
              // @ts-expect-error LocalAccountMethods vs OrchestrationAccount
              poolAccount,
              harden({ USDC: advanceAmount }),
            );
            void watch(depositV, this.facets.depositHandler, {
              advanceAmount,
              destination,
              forwardingAddress: evidence.tx.forwardingAddress,
              fullAmount,
              tmpSeat,
              txHash: evidence.txHash,
            });
          } catch (error) {
            log('Advancer error:', error);
            statusManager.observe(evidence);
          }
        },
        /** @param {ChainAddress} intermediateRecipient */
        setIntermediateRecipient(intermediateRecipient) {
          this.state.intermediateRecipient = intermediateRecipient;
        },
      },
      depositHandler: {
        /**
         * @param {undefined} result
         * @param {AdvancerVowCtx & { tmpSeat: ZCFSeat }} ctx
         */
        onFulfilled(result, ctx) {
          const { poolAccount, intermediateRecipient } = this.state;
          const { destination, advanceAmount, ...detail } = ctx;
          const transferV = E(poolAccount).transfer(
            destination,
            { denom: usdc.denom, value: advanceAmount.value },
            { forwardOpts: { intermediateRecipient } },
          );
          return watch(transferV, this.facets.transferHandler, {
            destination,
            advanceAmount,
            ...detail,
          });
        },
        /**
         * We do not expect this to be a common failure. it should only occur
         * if USDC is not registered in vbank or the tmpSeat has less than
         * `advanceAmount`.
         *
         * If we do hit this path, we return funds to the Liquidity Pool and
         * notify of Advancing failure.
         *
         * @param {Error} error
         * @param {AdvancerVowCtx & { tmpSeat: ZCFSeat }} ctx
         */
        onRejected(error, { tmpSeat, advanceAmount, ...restCtx }) {
          log(
            '⚠️ deposit to localOrchAccount failed, attempting to return payment to LP',
            error,
          );
          try {
            const { borrowerFacet, notifyFacet } = this.state;
            notifyFacet.notifyAdvancingResult(restCtx, false);
            borrowerFacet.returnToPool(tmpSeat, advanceAmount);
          } catch (e) {
            log('🚨 deposit to localOrchAccount failure recovery failed', e);
          }
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
          log('Advance transfer fulfilled', {
            advanceAmount,
            destination,
            result,
          });
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
          log('Advance transfer rejected', error);
          notifyFacet.notifyAdvancingResult(ctx, false);
        },
      },
    },
    {
      stateShape: harden({
        notifyFacet: M.remotable(),
        borrowerFacet: M.remotable(),
        poolAccount: M.remotable(),
        intermediateRecipient: M.opt(ChainAddressShape),
        settlementAddress: M.opt(ChainAddressShape),
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
