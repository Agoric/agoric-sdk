/**
 * OrchestrationFlow functions for {@link portfolio.contract.ts}
 *
 * @see {openPortfolio}
 * @see {rebalance}
 */
import type { GuestInterface } from '@agoric/async-flow';
import { decodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import { AmountMath, type Amount, type NatAmount } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import type {
  AccountId,
  Denom,
  OrchestrationAccount,
  OrchestrationFlow,
  Orchestrator,
} from '@agoric/orchestration';
import { coerceAccountId } from '@agoric/orchestration/src/utils/address.js';
import type { ZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import type { PublicSubscribers } from '@agoric/smart-wallet/src/types.ts';
import type { VTransferIBCEvent } from '@agoric/vats';
import type { ZCFSeat } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import { assert, Fail, q } from '@endo/errors';
import {
  AxelarChain,
  RebalanceStrategy,
  SupportedChain,
  type YieldProtocol,
} from './constants.js';
import {
  getChainNameOfPlaceRef,
  getKeywordOfPlaceRef,
  type AssetPlaceRef,
  type MovementDesc,
} from './offer-args.ts';
import type { AccountInfoFor, PortfolioKit } from './portfolio.exo.ts';
import {
  CCTP,
  changeGMPPosition,
  CompoundProtocol,
  provideEVMAccount,
  type EVMContext,
} from './pos-gmp.flows.ts';
import {
  agoricToNoble,
  changeUSDCPosition,
  nobleToAgoric,
  protocolUSDN,
} from './pos-usdn.flows.ts';
import type { Position } from './pos.exo.ts';
import {
  PoolPlaces,
  type EVMContractAddressesMap,
  type OfferArgsFor,
  type PoolKey,
  type ProposalType,
  type ProposalType0,
} from './type-guards.ts';
// XXX: import { VaultType } from '@agoric/cosmic-proto/dist/codegen/noble/dollar/vaults/v1/vaults';

const trace = makeTracer('PortF');
const { keys } = Object;

export type LocalAccount = OrchestrationAccount<{ chainId: 'agoric-any' }>;
export type NobleAccount = OrchestrationAccount<{ chainId: 'noble-any' }>;

export type PortfolioInstanceContext = {
  contracts: EVMContractAddressesMap;
  usdc: { brand: Brand<'nat'>; denom: Denom };
  gmpFeeInfo: { brand: Brand<'nat'>; denom: Denom; chainId: string };
  inertSubscriber: GuestInterface<ResolvedPublicTopic<never>['subscriber']>;
  zoeTools: GuestInterface<ZoeTools>;
};

type PortfolioBootstrapContext = PortfolioInstanceContext & {
  makePortfolioKit: () => GuestInterface<PortfolioKit>;
};

type AssetPlace =
  | { pos: Position }
  | { account: OrchestrationAccount<any> }
  | { proxy: AccountInfoFor[AxelarChain] }
  | { seat: ZCFSeat; keyword: string };

const placeLabel = (place: AssetPlace) => {
  if ('pos' in place) return place.pos.getPoolKey();
  if ('account' in place) return coerceAccountId(place.account.getAddress());
  if ('proxy' in place)
    return `${place.proxy.chainId}:${place.proxy.remoteAddress}`;
  return `seat:${place.keyword}`;
};

type AssetMovement = {
  how: string;
  amount: Amount<'nat'>;
  src: AssetPlace;
  dest: AssetPlace;
  apply: () => Promise<void>;
  recover: () => Promise<void>;
};
const moveStatus = ({ how, src, dest, amount }: AssetMovement) => ({
  how,
  src: placeLabel(src),
  dest: placeLabel(dest),
  amount,
});
const errmsg = (err: any) => ('message' in err ? err.message : `${err}`);

export type TransportDetail<
  How extends string,
  S extends SupportedChain,
  D extends SupportedChain,
> = {
  how: How;
  connections: { src: SupportedChain; dest: SupportedChain }[];
  apply: (
    amount: NatAmount,
    src: AccountInfoFor[S],
    dest: AccountInfoFor[D],
  ) => Promise<void>;
  recover: (
    amount: NatAmount,
    src: AccountInfoFor[S],
    dest: AccountInfoFor[D],
  ) => Promise<void>;
};

export type ProtocolDetail<
  P extends YieldProtocol,
  C extends SupportedChain,
  CTX,
> = {
  protocol: P;
  chains: C[];
  supply: (
    ctx: CTX,
    amount: NatAmount,
    src: AccountInfoFor[C],
  ) => Promise<void>;
  withdraw: (
    ctx: CTX,
    amount: NatAmount,
    dest: AccountInfoFor[C],
  ) => Promise<void>;
};

export const trackFlow = async (
  reporter: GuestInterface<PortfolioKit['reporter']>,
  moves: AssetMovement[],
) => {
  const flowId = reporter.allocateFlowId();
  let step = 1;
  try {
    for (const move of moves) {
      trace('trackFlow', step, moveStatus(move));
      reporter.publishFlowStatus(flowId, { step, ...moveStatus(move) });
      await move.apply();
      const { amount, src, dest } = move;
      if ('pos' in src) {
        src.pos.recordTransferOut(amount);
      }
      if ('pos' in dest) {
        dest.pos.recordTransferIn(amount);
      }
      step += 1;
    }
    // TODO(#NNNN): delete the flow storage node
    // reporter.publishFlowStatus(flowId, { complete: true });
  } catch (err) {
    console.error('⚠️ step', step, ' failed', err);
    const failure = moves[step - 1];
    const errStep = step;
    while (step > 1) {
      step -= 1;
      const move = moves[step - 1];
      const how = `unwind: ${move.how}`;
      reporter.publishFlowStatus(flowId, { step, ...moveStatus(move), how });
      try {
        await move.recover();
      } catch (err) {
        console.error('⚠️ unwind step', step, ' failed', err);
        // if a recover fails, we just give up and report `where` the assets are
        const { dest: where, ...ms } = moveStatus(move);
        const final = { step, ...ms, how, where, error: errmsg(err) };
        reporter.publishFlowStatus(flowId, final);
        throw err;
      }
    }
    reporter.publishFlowStatus(flowId, {
      step: errStep,
      ...moveStatus(failure),
      error: errmsg(err),
    });
    throw err;
  }
};

export const provideCosmosAccount = async <C extends 'agoric' | 'noble'>(
  orch: Orchestrator,
  chainName: C,
  kit: GuestInterface<PortfolioKit>, // Guest<T>?
): Promise<AccountInfoFor[C]> => {
  await null;
  let promiseMaybe = kit.manager.reserveAccount(chainName);
  if (promiseMaybe) {
    return promiseMaybe as unknown as Promise<AccountInfoFor[C]>;
  }

  // We have the map entry reserved
  switch (chainName) {
    case 'noble': {
      const nobleChain = await orch.getChain('noble');
      const ica: NobleAccount = await nobleChain.makeAccount();
      const info: AccountInfoFor['noble'] = {
        namespace: 'cosmos',
        chainName: 'noble' as const,
        ica,
      };
      kit.manager.resolveAccount(info);
      return info as AccountInfoFor[C];
    }
    case 'agoric': {
      const agoricChain = await orch.getChain('agoric');
      const lca = await agoricChain.makeAccount();
      const reg = await lca.monitorTransfers(kit.tap);
      trace('Monitoring transfers for', lca.getAddress().value);
      const info: AccountInfoFor['agoric'] = {
        namespace: 'cosmos',
        chainName,
        lca,
        reg,
      };
      kit.manager.resolveAccount(info);
      return info as AccountInfoFor[C];
    }
    default:
      throw Error('unreachable');
  }
};

const getAssetPlaceRefKind = (
  ref: AssetPlaceRef,
): 'pos' | 'accountId' | 'seat' => {
  if (keys(PoolPlaces).includes(ref)) return 'pos';
  if (getKeywordOfPlaceRef(ref)) return 'seat';
  if (getChainNameOfPlaceRef(ref)) return 'accountId';
  throw Fail`bad ref: ${ref}`;
};

type Way =
  | { how: 'localTransfer' }
  | { how: 'withdrawToSeat' }
  | { how: 'IBC'; src: 'agoric'; dest: 'noble' }
  | { how: 'IBC'; src: 'noble'; dest: 'agoric' }
  | { how: 'CCTP'; dest: AxelarChain }
  | { how: YieldProtocol; poolKey: PoolKey; src: SupportedChain }
  | { how: YieldProtocol; poolKey: PoolKey; dest: SupportedChain };

export const wayFromSrcToDesc = (moveDesc: MovementDesc): Way => {
  const { src } = moveDesc;
  const { dest } = moveDesc;

  const srcKind = getAssetPlaceRefKind(src);
  switch (srcKind) {
    case 'pos': {
      const destName = getChainNameOfPlaceRef(dest);
      if (!destName)
        throw Fail`src pos must have account as dest ${q(moveDesc)}`;
      const poolKey = src as PoolKey;
      // XXX check that destName is in protocol.chains
      return { how: PoolPlaces[poolKey].protocol, poolKey, dest: destName };
    }

    case 'seat':
      getAssetPlaceRefKind(dest) === 'accountId' || // XXX check for agoric
        Fail`src seat must have account as dest ${q(moveDesc)}`;
      return { how: 'localTransfer' };

    case 'accountId': {
      const srcName = getChainNameOfPlaceRef(src);
      assert(srcName);
      const destKind = getAssetPlaceRefKind(dest);
      switch (destKind) {
        case 'seat':
          return { how: 'withdrawToSeat' }; // XXX check that src is agoric
        case 'accountId':
          const destName = getChainNameOfPlaceRef(dest);
          assert(destName);
          if (keys(AxelarChain).includes(destName)) {
            srcName === 'noble' || Fail`src for ${q(destName)} must be noble`;
            return { how: 'CCTP', dest: destName as AxelarChain };
          }
          if (srcName === 'agoric' && destName === 'noble') {
            return { how: 'IBC', src: srcName, dest: destName };
          } else if (srcName === 'noble' && destName === 'agoric') {
            return { how: 'IBC', src: srcName, dest: destName };
          } else {
            throw Fail`no route between chains: ${q(moveDesc)}`;
          }
        case 'pos': {
          const poolKey = dest as PoolKey;

          return { how: PoolPlaces[poolKey].protocol, poolKey, src: srcName };
        }
        default:
          throw Fail`unreachable:${destKind} ${dest}`;
      }
    }
    default:
      throw Fail`unreachable: ${srcKind} ${src}`;
  }
};

const stepFlow = async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  moves: MovementDesc[],
  kit: GuestInterface<PortfolioKit>,
) => {
  const todo: AssetMovement[] = [];
  for (const move of moves) {
    trace('move', move);
    const way = wayFromSrcToDesc(move);
    const { amount } = move;
    switch (way.how) {
      case 'localTransfer': {
        const { lca } = await provideCosmosAccount(orch, 'agoric', kit);
        const amounts = (seat.getProposal() as ProposalType['rebalance']).give;
        if (
          'Deposit' in amounts &&
          amounts.Deposit &&
          !AmountMath.isEqual(amounts.Deposit, amount)
        ) {
          console.warn(
            'ignoring move amount',
            amount,
            'in favor of proposal',
            amounts.Deposit,
          );
        }
        todo.push({
          how: 'localTransfer',
          src: { seat, keyword: 'Deposit' },
          dest: { account: lca },
          amount, // XXX use amounts.Deposit
          apply: async () => {
            await ctx.zoeTools.localTransfer(seat, lca, amounts);
          },
          recover: async () => {
            await ctx.zoeTools.withdrawToSeat(lca, seat, amounts);
          },
        });
        break;
      }
      case 'withdrawToSeat': {
        const { lca } = await provideCosmosAccount(orch, 'agoric', kit);
        const amounts = { Cash: amount };
        todo.push({
          how: 'withdrawToSeat',
          src: { account: lca },
          dest: { seat, keyword: 'Cash' },
          amount,
          apply: async () => {
            await ctx.zoeTools.withdrawToSeat(lca, seat, amounts);
          },
          recover: async () => {
            await ctx.zoeTools.localTransfer(seat, lca, amounts);
          },
        });
        break;
      }

      case 'IBC': {
        const [aInfo, nInfo] = await Promise.all([
          provideCosmosAccount(orch, 'agoric', kit),
          provideCosmosAccount(orch, 'noble', kit),
        ]);
        if (way.src === 'agoric' && way.dest === 'noble') {
          const { how, apply, recover } = agoricToNoble;
          todo.push({
            how,
            amount,
            src: { account: aInfo.lca },
            dest: { account: nInfo.ica },
            apply: () => apply(amount, aInfo, nInfo),
            recover: () => recover(amount, aInfo, nInfo),
          });
        } else if (way.src === 'noble' && way.dest === 'agoric') {
          const { how, apply, recover } = nobleToAgoric;
          todo.push({
            how,
            amount,
            src: { account: nInfo.ica },
            dest: { account: aInfo.lca },
            apply: () => apply(amount, nInfo, aInfo),
            recover: () => recover(amount, nInfo, aInfo),
          });
        }
        break;
      }

      case 'CCTP': {
        const { how, apply, recover } = CCTP;
        const nInfo = await provideCosmosAccount(orch, 'noble', kit);
        const gArgs = {
          destinationEVMChain: way.dest,
          amounts: { Deposit: amount },
          keyword: 'Deposit',
        };
        const gInfo = await provideEVMAccount(orch, ctx, seat, gArgs, kit);
        todo.push({
          how,
          amount,
          src: { account: nInfo.ica },
          dest: { proxy: gInfo },
          apply: () => apply(amount, nInfo, gInfo),
          recover: () => recover(amount, nInfo, gInfo),
        });
        break;
      }

      case 'USDN': {
        const nInfo = await provideCosmosAccount(orch, 'noble', kit);
        const acctId = coerceAccountId(nInfo.ica.getAddress());
        const pos = kit.manager.providePosition('USDN', 'USDN', acctId);
        if ('src' in way) {
          const { supply } = protocolUSDN;
          todo.push({
            how: way.how,
            amount,
            src: { account: nInfo.ica },
            dest: { pos },
            apply: () => supply(amount, nInfo),
            recover: () => Fail`no recovery from supply (final step)`,
          });
        } else {
          Fail`TODO`;
        }
        break;
      }

      case 'Compound': {
        // XXX move this check up to wayFromSrcToDesc
        const chainName = 'src' in way ? way.src : way.dest;
        assert(keys(AxelarChain).includes(chainName));
        const evmChain = chainName as AxelarChain;

        const gArgs = {
          destinationEVMChain: evmChain,
          amounts: { CompoundAccount: amount },
          keyword: 'CompoundAccount',
        };
        const { lca } = await provideCosmosAccount(orch, 'agoric', kit);
        const gInfo = await provideEVMAccount(orch, ctx, seat, gArgs, kit);
        const accountId: AccountId = `${gInfo.chainId}:${gInfo.remoteAddress}`;
        const pos = kit.manager.providePosition(
          way.poolKey,
          'Compound',
          accountId,
        );
        const { denom } = ctx.gmpFeeInfo;
        const fee = { denom, value: move.fee ? move.fee.value : 0n };
        const evmCtx: EVMContext<'compound'> = {
          addresses: ctx.contracts[evmChain],
          lca,
          gmpFee: fee,
          gmpChainId: ctx.gmpFeeInfo.chainId,
        };

        if ('src' in way) {
          todo.push({
            how: way.how,
            src: { proxy: gInfo },
            amount,
            dest: { pos },
            apply: () => CompoundProtocol.supply(evmCtx, amount, gInfo),
            recover: () => assert.fail('last step. cannot recover'),
          });
        } else {
          todo.push({
            how: way.how,
            src: { proxy: gInfo },
            amount,
            dest: { pos },
            apply: () => CompoundProtocol.withdraw(evmCtx, amount, gInfo),
            recover: () => CompoundProtocol.supply(evmCtx, amount, gInfo),
          });
        }
        break;
      }

      default:
        throw Fail`TODO: ${way.how}`;
    }
  }

  await trackFlow(kit.reporter, todo);
};

export const rebalance = async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  offerArgs: OfferArgsFor['rebalance'],
  kit: GuestInterface<PortfolioKit>,
) => {
  trace('@@rebalance ctx', ctx);
  const { flow } = offerArgs || {};
  if (flow) return stepFlow(orch, ctx, seat, flow, kit);

  const proposal = seat.getProposal() as ProposalType0['rebalance'];
  trace('rebalance proposal', proposal.give, proposal.want, offerArgs);

  if (keys(proposal.want).length > 0) {
    throw Error('TODO: withdraw');
  }

  const { give } = proposal;
  if ('USDN' in give && give.USDN) {
    await changeUSDCPosition(give, offerArgs, orch, kit, ctx, seat);
  }

  const { entries } = Object;
  for (const [keyword, amount] of entries(give)) {
    if (!['Aave', 'Compound'].includes(keyword)) continue;
    const protocol = keyword as 'Aave' | 'Compound';
    await changeGMPPosition(orch, ctx, seat, offerArgs, kit, protocol, give);
  }
};

export const rebalanceFromTransfer = (async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  packet: VTransferIBCEvent['packet'],
  kit: PortfolioKit,
): Promise<{
  parsed: Awaited<ReturnType<LocalAccount['parseInboundTransfer']>> | null;
  handled: boolean;
}> => {
  await null;
  const { reader } = kit;

  const lca = reader.getLocalAccount();
  const parsed = await lca.parseInboundTransfer(packet);
  if (!parsed) {
    return harden({ parsed: null, handled: false });
  }
  trace('rebalanceFromTransfer parsed', parsed);

  const {
    amount,
    extra: { receiver },
  } = parsed;
  const { baseAddress, query } = decodeAddressHook(receiver);
  const { rebalance: strategy } = query;
  if (strategy === undefined) {
    return harden({ parsed, handled: false });
  }

  switch (strategy) {
    // Preset strategy is currently hardcoded to PreserveExistingProportions
    // XXX make it more dynamic, such as taking into account any prior
    // explicit earmarking of inbound transfers.
    case RebalanceStrategy.Preset:
    case RebalanceStrategy.PreserveExistingProportions: {
      // XXX implement PreserveExistingProportions
      trace(
        'rebalanceFromTransfer PreserveExistingProportions',
        amount,
        query,
        baseAddress,
      );
      throw harden({
        msg: 'rebalanceFromTransfer unimplemented PreserveExistingProportions strategy',
        amount,
        query,
        baseAddress,
      });
    }
    default: {
      Fail`unknown rebalance strategy ${strategy} for ${amount} in ${baseAddress}`;
    }
  }

  // Don't continue with the transfer, since we handled it.
  return harden({ parsed, handled: true });
}) satisfies OrchestrationFlow;

/**
 * Offer handler to make a portfolio and, optionally, open yield positions.
 *
 * ASSUME seat's proposal is guarded as per {@link makeProposalShapes}
 *
 * @returns {*} following continuing invitation pattern, with a topic
 * with a topic for the portfolio.
 */
export const openPortfolio = (async (
  orch: Orchestrator,
  ctx: PortfolioBootstrapContext,
  seat: ZCFSeat,
  offerArgs: OfferArgsFor['openPortfolio'],
) => {
  await null; // see https://github.com/Agoric/agoric-sdk/wiki/No-Nested-Await
  try {
    const { makePortfolioKit, zoeTools, contracts, usdc, inertSubscriber } =
      ctx;
    const kit = makePortfolioKit();
    await provideCosmosAccount(orch, 'agoric', kit);

    const portfolioCtx = {
      ...ctx,
      keeper: { ...kit.reader, ...kit.manager },
    };

    if (!seat.hasExited()) {
      try {
        await rebalance(orch, portfolioCtx, seat, offerArgs, kit);
      } catch (err) {
        console.error('⚠️ rebalance failed', err);
        seat.fail(err);
      }
    }

    if (!seat.hasExited()) seat.exit();

    const publicSubscribers: GuestInterface<PublicSubscribers> = {
      portfolio: {
        description: 'Portfolio',
        storagePath: await kit.reader.getStoragePath(),
        subscriber: inertSubscriber as any,
      },
    };
    return harden({
      invitationMakers: kit.invitationMakers,
      publicSubscribers,
    });
    /* c8 ignore start */
  } catch (err) {
    // XXX async flow DX: stack traces don't cross vow boundaries?
    console.error('🚨 openPortfolio flow failed', err);
    throw err;
  }
  /* c8 ignore end */
}) satisfies OrchestrationFlow;
harden(openPortfolio);
