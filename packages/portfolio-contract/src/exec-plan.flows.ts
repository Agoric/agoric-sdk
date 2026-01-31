import type { GuestInterface } from '@agoric/async-flow';
import type { OrchestrationFlow, Orchestrator } from '@agoric/orchestration';
import type { PortfolioKit } from './portfolio.exo.ts';
import type { PortfolioInstanceContext } from './portfolio.flows.ts';

/**
 * Execute Portfolio Orchestration Plan
 *
 * using GMP router style EVM orchestration.
 */
export const executePlanUsingRouter = (async (
  _orch: Orchestrator,
  _ctx: PortfolioInstanceContext,
  // seat?
  _pKit: GuestInterface<PortfolioKit>,
) => {
  throw Error('TODO: not impl');
}) satisfies OrchestrationFlow;
