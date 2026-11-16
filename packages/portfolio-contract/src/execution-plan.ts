/** Contract-internal handoff. Never accepted as a public FundsFlowPlan. */
import type { FundsFlowPlan } from '@agoric/portfolio-api';
import type { BoundStep } from './delegation-limits.ts';
import type { MovementDesc } from './type-guards-steps.ts';

export type ResolvedFlowPlan = Readonly<{
  plan: FundsFlowPlan | MovementDesc[];
  boundSteps?: Readonly<Partial<Record<number, BoundStep>>>;
}>;

/** Old durable vow results must retain their original plan representation. */
export type FlowPlanResult = ResolvedFlowPlan | FundsFlowPlan | MovementDesc[];
