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
import type { PortfolioKit } from './portfolio.exo.ts';

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
  const { give } = seat.getProposal();

  const kit = ctx.makePortfolioKit();

  const openUSDNPosition = async () => {
    const nobleChain = await orch.getChain('noble');
    const myNobleAccout = await nobleChain.makeAccount();
    kit.keeper.init('USDN', myNobleAccout);
    trace('withdraw', give.In, 'to local; transfer to', `${myNobleAccout}`);
    await ctx.zoeTools.localTransfer(seat, await localP, give);
    trace('TODO: MsgSwap');
    trace('TODO: MsgLock');
    // XXX abuse of storagePath
    const storagePath = coerceAccountId(myNobleAccout.getAddress());
    const topic = { description: 'USDN ICA', subscriber: 'TODO!', storagePath };
    return topic;
  };

  trace('TODO: only open USDN position if offerArgs says so');
  const topic = await openUSDNPosition();

  seat.exit();
  return { invitationMakers: kit.invitationMakers, publicTopics: [topic] };
}) satisfies OrchestrationFlow;
