/**
 * @file Advancer subscribes (handleTransactionEvent) to events published by the
 * transaction feed. When notified of an appropriate opportunity, it is
 * responsible for advancing funds to fastUSDC payees.
 *
 * main export: @see {prepareAdvancerKit}
 */

import type { HostInterface } from '@agoric/async-flow';
import type { Amount, Brand, NatAmount } from '@agoric/ertp';
import {
  EvidenceWithRiskShape,
  EvmHashShape,
} from '@agoric/fast-usdc/src/type-guards.js';
import type {
  EvidenceWithRisk,
  EvmHash,
  LogFn,
  NobleAddress,
} from '@agoric/fast-usdc/src/types.js';
import type { TypedPattern } from '@agoric/internal';
import { assertAllDefined, makeTracer } from '@agoric/internal';
import type {
  ChainHub,
  CosmosChainAddress,
  Denom,
  OrchestrationAccount,
} from '@agoric/orchestration';
import {
  AnyNatAmountShape,
  CosmosChainAddressShape,
} from '@agoric/orchestration';
import type { HostForGuest } from '@agoric/orchestration/src/facade.js';
import type { AccountId } from '@agoric/orchestration/src/orchestration-api.js';
import { parseAccountIdArg } from '@agoric/orchestration/src/utils/address.js';
import type { ZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import { M } from '@agoric/store';
import { pickFacet } from '@agoric/vat-data';
import type { VowTools } from '@agoric/vow';
import { VowShape } from '@agoric/vow';
import type { ZCF, ZCFSeat } from '@agoric/zoe/src/zoeService/zoe.js';
import type { Zone } from '@agoric/zone';
import { Fail, q } from '@endo/errors';
import { E } from '@endo/far';
import { type advanceFunds as advanceFundsT } from '../fast-usdc.flows.ts';
import { makeSupportsCctp } from '../utils/cctp.ts';
import type { LiquidityPoolKit } from './liquidity-pool.js';
import type { SettlerKit } from './settler.js';
import type { StatusManager } from './status-manager.js';

interface AdvancerKitPowers {
  advanceFunds: HostForGuest<typeof advanceFundsT>;
  chainHub: Pick<ChainHub, 'getChainInfoByChainId'>;
  getNobleICA: () => OrchestrationAccount<{ chainId: 'noble-1' }>;
  log?: LogFn;
  statusManager: StatusManager;
  usdc: { brand: Brand<'nat'>; denom: Denom };
  vowTools: VowTools;
  zcf: ZCF;
  zoeTools: ZoeTools;
}

interface AdvancerVowCtx {
  fullAmount: NatAmount;
  advanceAmount: NatAmount;
  destination: AccountId;
  forwardingAddress: NobleAddress;
  txHash: EvmHash;
}

const AdvancerVowCtxShape: TypedPattern<AdvancerVowCtx> = M.splitRecord(
  {
    fullAmount: AnyNatAmountShape,
    advanceAmount: AnyNatAmountShape,
    destination: M.string(), // AccountId
    forwardingAddress: M.string(),
    txHash: EvmHashShape,
  },
  { tmpSeat: M.remotable() },
);

/** type guards internal to the AdvancerKit */
const AdvancerKitI = harden({
  advancer: M.interface('AdvancerI', {
    handleTransactionEvent: M.call(EvidenceWithRiskShape).returns(),
  }),
  depositHandler: M.interface('DepositHandlerI', {
    onFulfilled: M.call(M.undefined(), AdvancerVowCtxShape).returns(VowShape),
    onRejected: M.call(M.error(), AdvancerVowCtxShape).returns(),
  }),
  transferHandler: M.interface('TransferHandlerI', {
    onFulfilled: M.call(M.undefined(), AdvancerVowCtxShape).returns(
      M.undefined(),
    ),
    onRejected: M.call(M.error(), AdvancerVowCtxShape).returns(M.undefined()),
  }),
  transferCctpHandler: M.interface('TransferHandlerI', {
    onFulfilled: M.call(M.undefined(), AdvancerVowCtxShape).returns(VowShape),
    onRejected: M.call(M.error(), AdvancerVowCtxShape).returns(M.undefined()),
  }),
  withdrawHandler: M.interface('WithdrawHandlerI', {
    onFulfilled: M.call(M.undefined(), {
      advanceAmount: AnyNatAmountShape,
      tmpReturnSeat: M.remotable(),
    }).returns(M.undefined()),
    onRejected: M.call(M.error(), {
      advanceAmount: AnyNatAmountShape,
      tmpReturnSeat: M.remotable(),
    }).returns(M.undefined()),
  }),
});

export const stateShape = harden({
  notifier: M.remotable(),
  borrower: M.remotable(),
  poolAccount: M.remotable(),
  /** @deprecated */
  intermediateRecipient: M.opt(CosmosChainAddressShape),
  settlementAddress: M.opt(CosmosChainAddressShape),
});

/**
 * Advancer subscribes (using handleTransactionEvent) to events published by the
 * {@link TransactionFeedKit}. When notified of an appropriate opportunity, it
 * is responsible for advancing funds to EUD.
 *
 * @param {Zone} zone
 * @param {AdvancerKitPowers} caps
 */
export const prepareAdvancerKit = (
  zone: Zone,
  {
    advanceFunds,
    chainHub,
    getNobleICA,
    log = makeTracer('Advancer', true),
    statusManager,
    usdc,
    vowTools: { asVow, watch },
    zcf,
    zoeTools: { withdrawToSeat },
  }: AdvancerKitPowers,
) => {
  assertAllDefined({
    chainHub,
    statusManager,
    watch,
  });
  const supportsCctp = makeSupportsCctp(chainHub);

  return zone.exoClassKit(
    'Fast USDC Advancer',
    AdvancerKitI,
    (config: {
      notifier: SettlerKit['notifier'];
      borrower: LiquidityPoolKit['borrower'];
      poolAccount: HostInterface<
        OrchestrationAccount<{ chainId: 'agoric-any' }>
      >;
      settlementAddress: CosmosChainAddress;
      intermediateRecipient?: CosmosChainAddress;
    }) =>
      harden({
        ...config,
        // deprecated, set key for schema compatibility
        intermediateRecipient: undefined,
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
        handleTransactionEvent({ evidence, risk }: EvidenceWithRisk) {
          const { notifier, borrower, poolAccount, settlementAddress } =
            this.state;
          // This function returns a Vow that does its own error handling.
          void advanceFunds(
            harden({ evidence, risk }),
            harden({
              notifier,
              borrower,
              // XXX asyncFlow membrane types
              poolAccount: poolAccount as unknown as OrchestrationAccount<{
                chainId: 'agoric-any';
              }>,
              settlementAddress,
            }),
          );
        },
      },

      // XXX the following handlers are from before refactoring to an async flow for `advanceFunds`.
      // They must remain implemented for as long as any vow might settle and need their behavior.
      // Once all possible such vows are settled, the methods could be removed but the handler
      // facets must remain to satisfy the kind definition backward compatibility checker.
      depositHandler: {
        /**
         * @param result
         * @param ctx
         * @throws {never} WARNING: this function must not throw, because user funds are at risk
         */
        onFulfilled(
          result: undefined,
          ctx: AdvancerVowCtx & { tmpSeat: ZCFSeat },
        ) {
          return asVow(() => {
            const { poolAccount, settlementAddress } = this.state;
            const { tmpSeat, ...vowContext } = ctx;
            const { destination, advanceAmount } = vowContext;
            tmpSeat.exit();
            const amount = harden({
              denom: usdc.denom,
              value: advanceAmount.value,
            });

            const intermediateRecipient = getNobleICA().getAddress();

            const destInfo = parseAccountIdArg(destination);
            if (destInfo.namespace === 'cosmos') {
              const vow =
                destInfo.reference === settlementAddress.chainId
                  ? // local
                    E(poolAccount).send(destination, amount)
                  : // via IBC
                    E(poolAccount).transfer(destination, amount, {
                      forwardOpts: {
                        intermediateRecipient,
                      },
                    });
              return watch(vow, this.facets.transferHandler, vowContext);
            } else if (supportsCctp(destination)) {
              // send USDC via CCTP
              return watch(
                E(poolAccount).transfer(intermediateRecipient, amount),
                this.facets.transferCctpHandler,
                vowContext,
              );
            } else {
              // This is supposed to be caught in handleTransactionEvent()
              Fail`🚨 can only transfer to Agoric addresses, via IBC, or via CCTP`;
            }
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
         * @throws {never} WARNING: this function must not throw, because user funds are at risk
         */
        onRejected(
          error: Error,
          {
            tmpSeat,
            advanceAmount,
            ...restCtx
          }: AdvancerVowCtx & { tmpSeat: ZCFSeat },
        ) {
          log(
            '⚠️ deposit to localOrchAccount failed, attempting to return payment to LP',
            error,
          );
          try {
            const { borrower, notifier } = this.state;
            notifier.notifyAdvancingResult(restCtx, false);
            borrower.returnToPool(tmpSeat, advanceAmount);
            tmpSeat.exit();
          } catch (e) {
            log('🚨 deposit to localOrchAccount failure recovery failed', e);
          }
        },
      },
      transferHandler: {
        /**
         * @param {undefined} result
         * @param {AdvancerVowCtx} ctx
         * @throws {never} WARNING: this function must not throw, because user funds are at risk
         */
        onFulfilled(result: undefined, ctx: AdvancerVowCtx) {
          const { notifier } = this.state;
          const { advanceAmount, destination, ...detail } = ctx;
          log('Advance succeeded', { advanceAmount, destination });
          notifier.notifyAdvancingResult({ destination, ...detail }, true);
        },
        onRejected(error: Error, ctx: AdvancerVowCtx) {
          const { notifier, poolAccount } = this.state;
          log('Advance failed', error);
          const { advanceAmount, ...restCtx } = ctx;
          notifier.notifyAdvancingResult(restCtx, false);
          const { zcfSeat: tmpReturnSeat } = zcf.makeEmptySeatKit();
          const withdrawV = withdrawToSeat(
            // @ts-expect-error LocalAccountMethods vs OrchestrationAccount
            poolAccount,
            tmpReturnSeat,
            harden({ USDC: advanceAmount }),
          );
          // WARNING: this must never reject, see handler @throws {never} below
          // void not enforced by linter until #10627 no-floating-vows
          void watch(withdrawV, this.facets.withdrawHandler, {
            advanceAmount,
            tmpReturnSeat,
          });
        },
      },
      transferCctpHandler: {
        /**
         * @param {undefined} result
         * @param {AdvancerVowCtx} ctx
         * @throws {never} WARNING: this function must not throw, because user funds are at risk
         */
        onFulfilled(result: undefined, ctx: AdvancerVowCtx) {
          const { advanceAmount, destination } = ctx;
          // assets are on noble, transfer to dest.
          const intermediaryAccount = getNobleICA();
          const amount = harden({
            denom: usdc.denom,
            value: advanceAmount.value,
          });
          const burn = intermediaryAccount.depositForBurn(destination, amount);
          return watch(burn, this.facets.transferHandler, ctx);
        },
        onRejected(error: Error, _ctx: AdvancerVowCtx) {
          log('🚨 CCTP transfer failed', error);
          // FIXME really handle, with tests
        },
      },
      withdrawHandler: {
        /**
         *
         * @param {undefined} result
         * @param ctx
         * @param ctx.advanceAmount
         * @param ctx.tmpReturnSeat
         * @throws {never} WARNING: this function must not throw, because user funds are at risk
         */
        onFulfilled(
          result: undefined,
          {
            advanceAmount,
            tmpReturnSeat,
          }: { advanceAmount: Amount<'nat'>; tmpReturnSeat: ZCFSeat },
        ) {
          const { borrower } = this.state;
          try {
            borrower.returnToPool(tmpReturnSeat, advanceAmount);
          } catch (e) {
            // If we reach here, the unused advance funds will remain in `tmpReturnSeat`
            // and must be retrieved from recovery sets.
            log(
              `🚨 return ${q(advanceAmount)} to pool failed. funds remain on "tmpReturnSeat"`,
              e,
            );
          }
        },
        /**
         * @param {Error} error
         * @param ctx
         * @param ctx.advanceAmount
         * @param ctx.tmpReturnSeat
         * @throws {never} WARNING: this function must not throw, because user funds are at risk
         */
        onRejected(
          error: Error,
          {
            advanceAmount,
            tmpReturnSeat,
          }: { advanceAmount: Amount<'nat'>; tmpReturnSeat: ZCFSeat },
        ) {
          log(
            `🚨 withdraw ${q(advanceAmount)} from "poolAccount" to return to pool failed`,
            error,
          );
          // If we reach here, the unused advance funds will remain in the `poolAccount`.
          // A contract update will be required to return them to the LiquidityPool.
          tmpReturnSeat.exit();
        },
      },
    },
    {
      stateShape,
    },
  );
};
harden(prepareAdvancerKit);

export const prepareAdvancer = (zone: Zone, caps: AdvancerKitPowers) => {
  const makeAdvancerKit = prepareAdvancerKit(zone, caps);
  return pickFacet(makeAdvancerKit, 'advancer');
};
harden(prepareAdvancer);
