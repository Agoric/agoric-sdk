import type { GuestInterface } from '@agoric/async-flow';
import { makeTracer } from '@agoric/internal';
import type {
  OrchestrationAccount,
  OrchestrationFlow,
  Orchestrator,
} from '@agoric/orchestration';
import { coerceAccountId } from '@agoric/orchestration/src/utils/address.js';
import type { ZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import type { ZCFSeat } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import type { PortfolioKit } from './portfolio.exo.ts';
import type { ProposalShapes } from './type-guards.ts';

const trace = makeTracer('PortF');

export const makeLocalAccount = (async (orch: Orchestrator, _ctx: unknown) => {
  const agoricChain = await orch.getChain('agoric');
  const account = (await agoricChain.makeAccount()) as OrchestrationAccount<{
    chainId: 'agoric-any';
  }>;

  return account;
}) satisfies OrchestrationFlow;
harden(makeLocalAccount);

export const openPortfolio = (async (
  orch: Orchestrator,
  ctx: {
    zoeTools: GuestInterface<Pick<ZoeTools, 'localTransfer'>>;
    makePortfolioKit: () => PortfolioKit;
  },
  seat: ZCFSeat,
  _offerArgs: unknown,
  localP: Promise<OrchestrationAccount<{ chainId: 'agoric-any' }>>,
) => {
  await null;
  const kit = ctx.makePortfolioKit();

  const openUSDNPosition = async (amount: Amount<'nat'>) => {
    const nobleChain = await orch.getChain('noble');
    const myNobleAccout = await nobleChain.makeAccount();
    // COMMIT
    // TODO: only make noble account once, even if something below fails
    kit.keeper.init('USDN', myNobleAccout);
    trace('withdraw', amount, 'to local; transfer to', `${myNobleAccout}`);
    await ctx.zoeTools.localTransfer(
      seat,
      await localP,
      harden({ USDN: amount }),
    );
    trace('TODO: MsgSwap');
    trace('TODO: MsgLock');
    // XXX abuse of storagePath
    const storagePath = coerceAccountId(myNobleAccout.getAddress());
    const topic: ResolvedPublicTopic<unknown> = {
      description: 'USDN ICA',
      subscriber: 'TODO!' as any,
      storagePath,
    };
    return topic;
  };

  const { give } = seat.getProposal() as ProposalShapes['openPortfolio'];
  const topics: ResolvedPublicTopic<unknown>[] = [];
  if (give.USDN) {
    const topic = await openUSDNPosition(give.USDN);
    topics.push(topic);
  }

  seat.exit();
  return {
    invitationMakers: kit.invitationMakers,
    publicTopics: harden(topics),
  };
}) satisfies OrchestrationFlow;
