import type { Guest, GuestInterface } from '@agoric/async-flow';
import { makeTracer } from '@agoric/internal';
import type { OrchestrationFlow, Orchestrator } from '@agoric/orchestration';
import type {
  FlowConfig,
  FlowDetail,
  FundsFlowPlan,
  MovementDesc,
} from '@agoric/portfolio-api';
import type { ZCFSeat } from '@agoric/zoe';
import type { PortfolioKit } from './portfolio.exo.ts';
import type {
  ExecutePlanOptions,
  PortfolioInstanceContext,
} from './portfolio.flows.ts';

const errmsg = (err: any) =>
  `${err != null && 'message' in err ? err.message : err}`;

/**
 * Execute Portfolio Orchestration Plan
 *
 * using GMP router style EVM orchestration.
 */
export const executePlanUsingRouter = (async (
  orch: Orchestrator,
  ctx: PortfolioInstanceContext,
  seat: ZCFSeat,
  pKit: GuestInterface<PortfolioKit>,
  flowDetail: FlowDetail,
  startedFlow?: ReturnType<
    GuestInterface<PortfolioKit>['manager']['startFlow']
  >,
  config?: FlowConfig,
  options?: ExecutePlanOptions,
) => {
  const pId = pKit.reader.getPortfolioId();
  const traceP = makeTracer(flowDetail.type).sub(`portfolio${pId}`);

  // XXX for backwards compatibility, startedFlow may be undefined
  const { stepsP, flowId } = startedFlow ?? pKit.manager.startFlow(flowDetail);
  const traceFlow = traceP.sub(`flow${flowId}`);
  await null;
  type X = Guest<typeof stepsP>;
  try {
    // idea: race with seat.getSubscriber()
    const plan = await (stepsP as unknown as Promise<
      MovementDesc[] | FundsFlowPlan
    >); // XXX Guest/Host types UNTIL #9822

    const steps = Array.isArray(plan) ? plan : plan.flow;
    if (steps.length === 0) {
      traceFlow('no steps to execute');
      pKit.reporter.publishFlowStatus(flowId, { state: 'done', ...flowDetail });
      return `flow${flowId}`;
    }

    // options?.evmDepositDetail @@@@

    await stepFlow(
      orch,
      ctx,
      seat,
      plan,
      pKit,
      traceP,
      flowId,
      flowDetail,
      config,
      { evmDepositDetail: options?.evmDepositDetail },
    );
    return `flow${flowId}`;
  } catch (err) {
    if (!seat.hasExited()) seat.fail(err);
    pKit.reporter.publishFlowStatus(flowId, {
      state: 'fail',
      step: 0,
      error: errmsg(err),
      how: `await plan`,
      ...flowDetail,
    });
    throw err;
  } finally {
    // The seat must be exited no matter what to avoid leaks
    if (!seat.hasExited()) seat.exit();
    // XXX flow.finish() would eliminate the possibility of sending the wrong one,
    // at the cost of an exo (or Far?)
    pKit.reporter.finishFlow(flowId);
  }
}) satisfies OrchestrationFlow;
