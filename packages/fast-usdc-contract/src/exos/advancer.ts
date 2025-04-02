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
  AccountId,
  ChainInfo,
} from '@agoric/orchestration';
import {
  AnyNatAmountShape,
  CosmosChainAddressShape,
} from '@agoric/orchestration';
import type { ZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import type { NobleMethods } from '@agoric/orchestration/src/cosmos-api.js';
import { pickFacet } from '@agoric/vat-data';
import type { VowTools } from '@agoric/vow';
import { VowShape } from '@agoric/vow';
import type { ZCF, ZCFSeat } from '@agoric/zoe/src/zoeService/zoe.js';
import type { Zone } from '@agoric/zone';
import { Fail, q } from '@endo/errors';
import { E } from '@endo/far';
import { M, mustMatch } from '@endo/patterns';
import { parseAccountIdArg } from '@agoric/orchestration/src/utils/address.js';
import { chainInfoCaipId } from '@agoric/orchestration/src/utils/chain-info.js';
import type { Caip10Record } from '@agoric/orchestration/src/orchestration-api.js';
import type { Baggage } from '@agoric/swingset-liveslots/src/vatDataTypes.js';
import type { LiquidityPoolKit } from './liquidity-pool.js';
import type { StatusManager } from './status-manager.js';
import type { SettlerKit } from './settler.js';

interface AdvancerKitPowers {
  baggage: Baggage;
  chainHub: ChainHub;
  feeConfig: FeeConfig;
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
  destination: CosmosChainAddress;
  forwardingAddress: NobleAddress;
  txHash: EvmHash;
  destAccountId: Caip10Record;
  destChainInfo: ChainInfo;
}

const AdvancerVowCtxShape: TypedPattern<AdvancerVowCtx> = M.splitRecord(
  {
    fullAmount: AnyNatAmountShape,
    advanceAmount: AnyNatAmountShape,
    destination: CosmosChainAddressShape,
    forwardingAddress: M.string(),
    txHash: EvmHashShape,
  },
  { tmpSeat: M.remotable() },
);

const INTERMEDIARY_ACCOUNT = 'IntermediaryAccount';

/** type guards internal to the AdvancerKit */
const AdvancerKitI = harden({
  advancer: M.interface('AdvancerI', {
    handleTransactionEvent: M.callWhen(EvidenceWithRiskShape).returns(),
    setIntermediateAccount: M.call(
      M.remotable('NobleAccount'),
      CosmosChainAddressShape,
    ).returns(),
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
  intermediateRecipient: M.opt(CosmosChainAddressShape),
  settlementAddress: M.opt(CosmosChainAddressShape),
});

const makeCosmosAccountId = (
  chainId: string,
  encoding: 'bech32' | 'ethereum',
  value: string,
) => {
  return {
    chainId,
    encoding,
    value,
  };
};

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
    // baggage until exo state migrations: https://github.com/Agoric/agoric-sdk/issues/10200
    baggage,
    chainHub,
    feeConfig,
    log = makeTracer('Advancer', true),
    statusManager,
    usdc,
    vowTools: { watch, when, asVow },
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

  const getIntermediaryAccount = () => {
    const intermediaryAccount = baggage.get(INTERMEDIARY_ACCOUNT);
    assert(intermediaryAccount);
    return intermediaryAccount;
  };

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
        async handleTransactionEvent({ evidence, risk }: EvidenceWithRisk) {
          await null;
          try {
            if (statusManager.hasBeenObserved(evidence)) {
              log('txHash already seen:', evidence.txHash);
              return;
            }

            debugger;

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
              const errorMessage = `decoded address ${decoded.baseAddress} must match settlement address ${settlementAddress.value}`;
              log(errorMessage);
              statusManager.skipAdvance(evidence, [errorMessage]);
            }
            const { EUD } = decoded.query;
            log(`decoded EUD: ${EUD}`);
            assert.typeof(EUD, 'string');
            // throws if the bech32 prefix is not found
            const destination = chainHub.makeChainAddress(EUD);

            /** @type {AccountId} */
            const accountId = parseAccountIdArg(destination);
            const chainId = accountId.reference;
            const info = await when(chainHub.getChainInfo(chainId));

            // These are the cases that are currently supported
            if (
              chainId !== settlementAddress.chainId &&
              info.namespace !== 'cosmos' &&
              !info.cctpDestinationDomain
            ) {
              statusManager.skipAdvance(evidence, [
                `Transfer to ${chainId} not supported.`,
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
            const advanceAmount = feeTools.calculateAdvance(fullAmount);

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
            const advancerCtx = {
              advanceAmount,
              destination,
              forwardingAddress: evidence.tx.forwardingAddress,
              fullAmount,
              tmpSeat,
              txHash: evidence.txHash,
              destAccountId: accountId,
              destChainInfo: info,
            };
            void watch(depositV, this.facets.depositHandler, advancerCtx);
          } catch (error) {
            log('Advancer error:', error);
            statusManager.skipAdvance(evidence, [(error as Error).message]);
          }
        },
        setIntermediateAccount(
          intermediateRecipientAccount: HostInterface<
            NobleMethods &
              OrchestrationAccount<{
                chainId: 'agoric-any';
              }>
          >,
          intermediateRecipientAddress: CosmosChainAddress,
        ) {
          this.state.intermediateRecipient = intermediateRecipientAddress;
          if (baggage.has(INTERMEDIARY_ACCOUNT)) {
            baggage.set(INTERMEDIARY_ACCOUNT, intermediateRecipientAddress);
          } else {
            baggage.init(INTERMEDIARY_ACCOUNT, intermediateRecipientAddress);
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
            const { poolAccount, intermediateRecipient, settlementAddress } =
              this.state;
            const { tmpSeat, ...vowContext } = ctx;
            const {
              destination,
              advanceAmount,
              destChainInfo: info,
              destAccountId: accountId,
              ...detail
            } = vowContext;
            tmpSeat.exit();
            const amount = harden({
              denom: usdc.denom,
              value: advanceAmount.value,
            });
            const chainId = accountId.reference;

            let transferOrSendV;
            if (chainId === settlementAddress.chainId) {
              // send to recipient on Agoric

              /** @type {CosmosChainAddress} */
              const cosmosAddress = makeCosmosAccountId(
                chainId,
                'bech32',
                accountId.accountAddress,
              );
              transferOrSendV = E(poolAccount).send(cosmosAddress, amount);
            } else if (info.namespace === 'cosmos') {
              // send via IBC

              transferOrSendV = E(poolAccount).transfer(destination, amount, {
                forwardOpts: {
                  intermediateRecipient,
                },
              });
            } else if (info.cctpDestinationDomain) {
              // send USDC via CCTP

              // assets are on noble, transfer to dest.
              const encoding = 'ethereum'; // XXX could be solana?
              const intermediaryAccount = getIntermediaryAccount();
              transferOrSendV = intermediaryAccount.depositForBurn(
                `${chainInfoCaipId(info)}:${accountId.accountAddress}`,
                amount,
              );
            } else {
              // This was supposed to be caught in handleTransactionEvent()
              Fail`can only transfer to Agoric addresses, via IBC, or via CCTP`;
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
          const caip10Dest = parseAccountIdArg(destination);
          const cosmosAddress = makeCosmosAccountId(
            caip10Dest.reference,
            'bech32',
            caip10Dest.accountAddress,
          );
          notifier.notifyAdvancingResult(
            { destination: cosmosAddress, ...detail },
            true,
          );
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
