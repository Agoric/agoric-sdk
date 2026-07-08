/**
 * @file Planner exo for off-chain planning services to submit portfolio rebalancing plans.
 * @see {@link preparePlanner}
 */
import { makeTracer, type TypedPattern } from '@agoric/internal';
import type {
  FlowKey,
  FundsFlowPlan,
  PortfolioDelegatedRebalanceParams,
} from '@agoric/portfolio-api';
import type { Zone } from '@agoric/zone';
import { M } from '@endo/patterns';
import {
  PortfolioDelegatedRebalanceParamsShape,
  type PortfolioDelegationClient,
} from './delegation.exo.ts';
import type { PortfolioKit } from './portfolio.exo.ts';
import type { MovementDesc } from './type-guards-steps.ts';
import { makeOfferArgsShapes } from './type-guards-steps.ts';
import { flowIdFromKey, FlowKeyShape } from './type-guards.ts';

const trace = makeTracer('PPLN');

const OrderShape: TypedPattern<FundsFlowPlan['order']> = M.arrayOf([
  M.number(),
  M.arrayOf(M.number()),
]);

/**
 * Prepare a Planner exoClass for off-chain planning services.
 *
 * Planning is currently done off-chain
 * because it requires access to real-time APYs, balances, and market data that
 * are not readily available to the on-chain contract.
 */
export const preparePlanner = (
  zone: Zone,
  {
    getPortfolioPlanner,
    getPlannerDelegation,
    shapes,
  }: {
    getPortfolioPlanner: (id: number) => PortfolioKit['planner'];
    getPlannerDelegation: (
      portfolioPlanner: PortfolioKit['planner'],
    ) => PortfolioDelegationClient | undefined;
    shapes: ReturnType<typeof makeOfferArgsShapes>;
  },
) => {
  const { movementDescShape } = shapes;
  const planShape: TypedPattern<FundsFlowPlan> = M.splitRecord(
    { flow: M.arrayOf(movementDescShape) },
    { order: OrderShape },
  );
  const planCompatShape = M.or(planShape, M.arrayOf(movementDescShape));

  const portfolioIdShape = M.number();
  const flowIdShape = M.number();
  const policyVersionShape = M.number();
  const rebalanceCountShape = M.number();

  const PlannerI = M.interface('Planner', {
    resolvePlan: M.call(
      portfolioIdShape,
      flowIdShape,
      planCompatShape,
      policyVersionShape,
    )
      .optional(rebalanceCountShape)
      .returns(),
    rejectPlan: M.call(portfolioIdShape, flowIdShape, M.string())
      .optional(policyVersionShape, rebalanceCountShape)
      .returns(),
    rebalance: M.call(
      portfolioIdShape,
      PortfolioDelegatedRebalanceParamsShape,
      planCompatShape,
    ).returns(FlowKeyShape),
  });

  return zone.exoClass(
    'Planner',
    PlannerI,
    () => ({ etc: undefined }),
    {
      resolvePlan(
        portfolioId: number,
        flowId: number,
        planOrSteps: FundsFlowPlan | MovementDesc[],
        policyVersion: number,
        rebalanceCount = 0,
      ) {
        const traceFlow = trace
          .sub(`portfolio${portfolioId}`)
          .sub(`flow${flowId}`);
        traceFlow('TODO(#11782): vet plan', planOrSteps);
        const portfolioPlanner = getPortfolioPlanner(portfolioId);
        portfolioPlanner.submitVersion(policyVersion, rebalanceCount);
        portfolioPlanner.resolveFlowPlan(flowId, planOrSteps);
      },
      rejectPlan(
        portfolioId: number,
        flowId: number,
        reason: string,
        policyVersion: number,
        rebalanceCount: number,
      ) {
        trace('reject plan', { portfolioId, flowId, reason });
        const portfolioPlanner = getPortfolioPlanner(portfolioId);
        portfolioPlanner.submitVersion(policyVersion, rebalanceCount);
        portfolioPlanner.rejectFlowPlan(flowId, reason);
      },
      rebalance(
        portfolioId: number,
        delegatedRebalanceParams: PortfolioDelegatedRebalanceParams,
        planOrSteps: FundsFlowPlan | MovementDesc[],
      ): FlowKey {
        const portfolioPlanner = getPortfolioPlanner(portfolioId);
        const delegationClient = getPlannerDelegation(portfolioPlanner);
        assert(
          delegationClient && delegationClient.getReader().isActive(),
          `planner delegation must be active for portfolio ${portfolioId}`,
        );

        const autoFeatures = delegationClient.getReader().getAutoFeatures();
        assert(
          autoFeatures?.rebalance,
          `portfolio ${portfolioId} auto-feature "rebalance" must be enabled`,
        );

        // The flow created by rebalance is guaranteed to have its plan sync kit
        // fully ready.
        const flowKey = delegationClient.rebalance(delegatedRebalanceParams);
        const flowId = flowIdFromKey(flowKey);
        trace.sub(`portfolio${portfolioId}`).sub(flowKey)(
          'TODO(#11782): vet delegated plan',
          planOrSteps,
        );
        portfolioPlanner.submitVersion(
          delegatedRebalanceParams.syncState.policyVersion,
          delegatedRebalanceParams.syncState.rebalanceCount,
        );
        portfolioPlanner.resolveFlowPlan(flowId, planOrSteps);
        return flowKey;
      },
    },
    {
      stateShape: { etc: M.any() },
    },
  );
};

export type PortfolioPlanner = ReturnType<ReturnType<typeof preparePlanner>>;
