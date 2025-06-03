import type { GuestInterface } from '@agoric/async-flow';
import { makeTracer } from '@agoric/internal';
import type {
  OrchestrationAccount,
  OrchestrationFlow,
  Orchestrator,
} from '@agoric/orchestration';
import type { ZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import type { ZCFSeat } from '@agoric/zoe';

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
  },
  seat: ZCFSeat,
  _offerArgs: unknown,
  localP: Promise<OrchestrationAccount<{ chainId: 'agoric-any' }>>,
) => {
  const { give } = seat.getProposal();

  trace('TODO: make portfolio exo');

  // TODO: move this to a portfolio exo method
  const openUSDNPosition = async () => {
    const nobleChain = await orch.getChain('noble');
    const myNobleAccout = await nobleChain.makeAccount();
    trace('TODO: save noble ICA in portfolio', `${myNobleAccout}`);
    trace('withdraw', give.In, 'to local; transfer to', `${myNobleAccout}`);
    await ctx.zoeTools.localTransfer(seat, await localP, give);
    trace('TODO: MsgSwap');
    trace('TODO: MsgLock');
  };

  trace('TODO: only open USDN position if offerArgs says so');
  await openUSDNPosition();

  seat.exit();
  return 'TODO: continuing invitation';
}) satisfies OrchestrationFlow;
