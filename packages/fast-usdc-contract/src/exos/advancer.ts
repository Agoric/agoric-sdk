/**
 * @file Advancer subscribes (handleTransactionEvent) to events published by the
 * transaction feed. When notified of an appropriate opportunity, it is
 * responsible for advancing funds to fastUSDC payees.
 *
 * main export: @see {prepareAdvancerKit}
 */

import type { HostInterface } from '@agoric/async-flow';
import { decodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import type { Amount, Brand, NatAmount } from '@agoric/ertp';
import { AmountMath } from '@agoric/ertp';
import {
  AddressHookShape,
  EvidenceWithRiskShape,
  EvmHashShape,
} from '@agoric/fast-usdc/src/type-guards.js';
import type {
  EvidenceWithRisk,
  EvmHash,
  FeeConfig,
  LogFn,
  NobleAddress,
} from '@agoric/fast-usdc/src/types.js';
import { makeFeeTools } from '@agoric/fast-usdc/src/utils/fees.js';
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
import type { AccountId } from '@agoric/orchestration/src/orchestration-api.js';
import {
  chainOfAccount,
  parseAccountId,
  parseAccountIdArg,
} from '@agoric/orchestration/src/utils/address.js';
import type { ZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import { M, mustMatch } from '@agoric/store';
import { pickFacet } from '@agoric/vat-data';
import type { VowTools } from '@agoric/vow';
import { VowShape } from '@agoric/vow';
import type { ZCF, ZCFSeat } from '@agoric/zoe/src/zoeService/zoe.js';
import type { Zone } from '@agoric/zone';
import { Fail, q } from '@endo/errors';
import { E } from '@endo/far';
import { makeSupportsCctp } from '../utils/cctp.ts';
import type { LiquidityPoolKit } from './liquidity-pool.js';
import type { SettlerKit } from './settler.js';
import type { StatusManager } from './status-manager.js';

interface AdvancerKitPowers {
  chainHub: ChainHub;
  feeConfig: FeeConfig;
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
    chainHub,
    feeConfig,
    getNobleICA,
    log = makeTracer('Advancer', true),
    statusManager,
    usdc,
    vowTools: { asVow, watch, when },
    zcf,
    zoeTools: { localTransfer, withdrawToSeat },
  }: AdvancerKitPowers,
) => {
  assertAllDefined({
    chainHub,
    feeConfig,
    statusManager,
    watch,
    when,
  });
  const feeTools = makeFeeTools(feeConfig);
  const toAmount = (value: bigint) => AmountMath.make(usdc.brand, value);

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
            const { settlementAddress } = this.state;
            const { recipientAddress } = evidence.aux;
            const decoded = decodeAddressHook(recipientAddress);
            mustMatch(decoded, AddressHookShape);
            if (decoded.baseAddress !== settlementAddress.value) {
              throw Fail`⚠️ baseAddress of address hook ${q(decoded.baseAddress)} does not match the expected address ${q(settlementAddress.value)}`;
            }
            const { EUD } = decoded.query;
            log(`decoded EUD: ${EUD}`);

            // throws if it's neither CAIP-10 nor bare bech32.
            const destination = chainHub.resolveAccountId(EUD);
            const accountId = parseAccountId(destination);

            // Dest must be a Cosmos account or support CCTP
            if (
              !(accountId.namespace === 'cosmos' || supportsCctp(destination))
            ) {
              const destChain = chainOfAccount(destination);
              statusManager.skipAdvance(evidence, [
                `Transfer to ${destChain} not supported.`,
              ]);
            }

            const fullAmount = toAmount(evidence.tx.amount);
            const { borrower, notifier, poolAccount } = this.state;
            // do not advance if we've already received a mint/settlement
            const mintedEarly = notifier.checkMintedEarly(
              evidence,
              destination,
            );
            if (mintedEarly) return;

            // throws if requested does not exceed fees
            const advanceAmount = feeTools.calculateAdvance(
              fullAmount,
              destination,
            );

            const { zcfSeat: tmpSeat } = zcf.makeEmptySeatKit();
            // throws if the pool has insufficient funds
            borrower.borrow(tmpSeat, advanceAmount);

            // this cannot throw since `.isSeen()` is called in the same turn
            statusManager.advance(evidence);

            const depositV = localTransfer(
              tmpSeat,
              // @ts-expect-error LocalAccountMethods vs OrchestrationAccount
              poolAccount,
              harden({ USDC: advanceAmount }),
            );
            // WARNING: this must never reject, see handler @throws {never} below
            // void not enforced by linter until #10627 no-floating-vows
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
            statusManager.skipAdvance(evidence, [(error as Error).message]);
          }
        },
      },

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
          return asVow(async () => {
            const { poolAccount, settlementAddress } = this.state;
            const { tmpSeat, ...vowContext } = ctx;
            const { destination, advanceAmount, ...detail } = vowContext;
            tmpSeat.exit();
            const amount = harden({
              denom: usdc.denom,
              value: advanceAmount.value,
            });
            const accountId = parseAccountIdArg(destination);
            await null;

            const intermediaryAccount = getNobleICA();
            const intermediaryAddress = intermediaryAccount.getAddress();

            let transferOrSendV;
            if (
              accountId.namespace === 'cosmos' &&
              accountId.reference === settlementAddress.chainId
            ) {
              // send to recipient on Agoric
              transferOrSendV = E(poolAccount).send(destination, amount);
            } else if (accountId.namespace === 'cosmos') {
              // send via IBC

              transferOrSendV = E(poolAccount).transfer(destination, amount, {
                forwardOpts: {
                  intermediateRecipient: intermediaryAddress,
                },
              });
            } else if (supportsCctp(destination)) {
              // send USDC via CCTP

              await E(poolAccount).transfer(intermediaryAddress, amount);
              // assets are on noble, transfer to dest.

              transferOrSendV = intermediaryAccount.depositForBurn(
                destination,
                amount,
              );
            } else {
              // This is supposed to be caught in handleTransactionEvent()
              Fail`🚨 can only transfer to Agoric addresses, via IBC, or via CCTP`;
            }

            return watch(
              transferOrSendV,
              this.facets.transferHandler,
              vowContext,
            );
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
