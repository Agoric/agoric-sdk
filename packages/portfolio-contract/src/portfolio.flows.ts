/**
 * OrchestrationFlow functions for {@link portfolio.contract.ts}
 *
 * @see {openPortfolio}
 * @see {rebalance}
 */
import type { GuestInterface } from '@agoric/async-flow';
import { AmountMath, type Amount } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import type {
  Denom,
  OrchestrationAccount,
  OrchestrationFlow,
  Orchestrator,
} from '@agoric/orchestration';
import { coerceAccountId } from '@agoric/orchestration/src/utils/address.js';
import type { ZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import type { PublicSubscribers } from '@agoric/smart-wallet/src/types.ts';
import type { ZCFSeat } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import type {
  AccountInfoFor,
  ChainAccountKey,
  PortfolioKit,
  Position,
} from './portfolio.exo.ts';
import { changeUSDCPosition } from './pos-usdn.flows.ts';
import type {
  AxelarChainsMap,
  OfferArgsFor,
  ProposalType,
} from './type-guards.ts';
import { changeGMPPosition } from './pos-gmp.flows.ts';

const trace = makeTracer('PortF');
const { keys } = Object;

export type LocalAccount = OrchestrationAccount<{ chainId: 'agoric-any' }>;
export type NobleAccount = OrchestrationAccount<{ chainId: 'noble-any' }>; // TODO: move to type-guards as external interface?

type PortfolioBootstrapContext = {
  axelarChainsMap: AxelarChainsMap;
  chainHubTools: {
    getDenom: (brand: Brand) => Denom | undefined;
  };
  zoeTools: GuestInterface<ZoeTools>;
  makePortfolioKit: () => GuestInterface<PortfolioKit>;
  inertSubscriber: GuestInterface<ResolvedPublicTopic<unknown>['subscriber']>;
};

export type PortfolioInstanceContext = {
  axelarChainsMap: AxelarChainsMap;
  chainHubTools: {
    getDenom: (brand: Brand) => Denom | undefined;
  };
  inertSubscriber: GuestInterface<ResolvedPublicTopic<never>['subscriber']>;
  zoeTools: GuestInterface<ZoeTools>;
};

/* c8 ignore end */

type AssetPlace =
  | { pos: Position }
  | { account: OrchestrationAccount<any> }
  | { seat: ZCFSeat; keyword: string };

const placeLabel = (place: AssetPlace) => {
  if ('pos' in place) return place.pos.getPoolKey();
  if ('account' in place) return coerceAccountId(place.account.getAddress());
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

export const trackFlow = async (
  reporter: GuestInterface<PortfolioKit['reporter']>,
  moves: AssetMovement[],
) => {
  const flowId = reporter.allocateFlowId();
  let step = 1;
  try {
    for (const move of moves) {
      trace(step, moveStatus(move));
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
    // TODO: delete the flow storage node
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

export const provideAccountInfo = async <C extends ChainAccountKey>(
  orch: Orchestrator,
  chainName: C,
  kit: GuestInterface<PortfolioKit>, // Guest<T>?
): Promise<AccountInfoFor[C]> => {
  await null;
  // TODO: async provide
  let promiseMaybe = kit.manager.reserveAccount(chainName);
  if (promiseMaybe) {
    return promiseMaybe as unknown as Promise<AccountInfoFor[C]>;
  }

  // We have the map entry reserved
  switch (chainName) {
    case 'noble': {
      const nobleChain = await orch.getChain('noble');
      const ica: NobleAccount = await nobleChain.makeAccount();
      const info: AccountInfoFor['noble'] = { type: 'noble' as const, ica };
      kit.manager.resolveAccount(info);
      return info as AccountInfoFor[C];
    }
    case 'agoric': {
      const agoricChain = await orch.getChain('agoric');
      const lca = await agoricChain.makeAccount();
      const reg = await lca.monitorTransfers(kit.tap);
      trace('Monitoring transfers for', lca.getAddress().value);
      const info: AccountInfoFor['agoric'] = { type: chainName, lca, reg };
      kit.manager.resolveAccount(info);
      return info as AccountInfoFor[C];
    }
    default:
      throw Error('unreachable');
  }
};

export const rebalance = async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  offerArgs: OfferArgsFor['rebalance'],
  kit: GuestInterface<PortfolioKit>,
) => {
  const proposal = seat.getProposal() as ProposalType['rebalance'];
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
  offerArgs: OfferArgsFor['openPortfolio'], // TODO: USDN/USDC ratio
) => {
  await null; // see https://github.com/Agoric/agoric-sdk/wiki/No-Nested-Await
  try {
    const {
      makePortfolioKit,
      zoeTools,
      axelarChainsMap,
      chainHubTools,
      inertSubscriber,
    } = ctx;
    const kit = makePortfolioKit();

    const portfolioCtx = {
      axelarChainsMap,
      chainHubTools,
      keeper: { ...kit.reader, ...kit.manager },
      zoeTools,
      inertSubscriber,
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
