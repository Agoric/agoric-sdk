/**
 * @file Planner exo for off-chain planning services to submit portfolio rebalancing plans.
 * @see {@link preparePlanner}
 */
import { makeTracer } from '@agoric/internal';
import {
  PortfolioDelegatedClaimRewardsParamsShape,
  PortfolioDelegatedRebalanceParamsShape,
  type FlowKey,
  type FundsFlowPlan,
  type PortfolioDelegatedClaimRewardsParams,
  type PortfolioDelegatedRebalanceParams,
} from '@agoric/portfolio-api';
import type { Zone } from '@agoric/zone';
import { Fail } from '@endo/errors';
import { M } from '@endo/patterns';
import type { PortfolioDelegationClient } from './delegation.exo.ts';
import { vetNoNewPositions } from './delegation-limits.ts';
import type { PortfolioKit } from './portfolio.exo.ts';
import type { MovementDesc } from './type-guards-steps.ts';
import { makeOfferArgsShapes, MAX_PLAN_STEPS } from './type-guards-steps.ts';
import {
  flowIdFromKey,
  FlowKeyShape,
  PlanObservationsShape,
  type PlannerPlanObservations,
} from './type-guards.ts';

const trace = makeTracer('PPLN');

/**
 * Prepare a Planner exoClass for off-chain planning services.
 *
 * Planning remains off-chain, where the planner can use APYs and other market
 * data. This exo validates submitted plans against attested portfolio
 * observations and contract policy before execution.
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
  const { movementDescShape, plan: planShape } = shapes;
  const planCompatShape = M.or(
    planShape,
    M.arrayOf(movementDescShape, { arrayLengthLimit: MAX_PLAN_STEPS }),
  );

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
      .optional(rebalanceCountShape, PlanObservationsShape)
      .returns(),
    rejectPlan: M.call(portfolioIdShape, flowIdShape, M.string())
      .optional(policyVersionShape, rebalanceCountShape)
      .returns(),
    rebalance: M.callWhen(
      portfolioIdShape,
      PortfolioDelegatedRebalanceParamsShape,
      planCompatShape,
    ).returns(FlowKeyShape),
    // The delegation client checks the content of the plan and observations.
    claimRewards: M.callWhen(
      portfolioIdShape,
      PortfolioDelegatedClaimRewardsParamsShape,
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
        observations?: PlannerPlanObservations,
      ) {
        const traceFlow = trace
          .sub(`portfolio${portfolioId}`)
          .sub(`flow${flowId}`);
        traceFlow('TODO(#11782): vet plan', planOrSteps);
        const portfolioPlanner = getPortfolioPlanner(portfolioId);
        vetNoNewPositions(portfolioPlanner.getTargetAllocation(), planOrSteps);
        let acceptedSyncState;
        try {
          acceptedSyncState = portfolioPlanner.validateAndCommitPlanPolicy(
            flowId,
            observations,
            policyVersion,
            rebalanceCount,
          );
        } catch (reason) {
          const message =
            reason instanceof Error ? reason.message : String(reason);
          traceFlow('reject plan against mandate', message);
          portfolioPlanner.submitVersion(policyVersion, rebalanceCount);
          portfolioPlanner.rejectFlowPlan(flowId, message);
          return;
        }
        portfolioPlanner.submitVersion(
          acceptedSyncState.policyVersion,
          acceptedSyncState.rebalanceCount,
        );
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
      async rebalance(
        portfolioId: number,
        delegatedRebalanceParams: PortfolioDelegatedRebalanceParams,
        planOrSteps: FundsFlowPlan | MovementDesc[],
      ): Promise<FlowKey> {
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

        const { plan, signedObservations } = delegatedRebalanceParams;
        (plan === undefined && signedObservations === undefined) ||
          Fail`a separate plan excludes a plan or signed observations in the params`;

        // The flow created by rebalance is guaranteed to have its plan sync kit
        // fully ready. Without observations to verify, it starts promptly.
        const flowKey = await delegationClient.rebalance(
          delegatedRebalanceParams,
        );
        const flowId = flowIdFromKey(flowKey);
        trace.sub(`portfolio${portfolioId}`).sub(flowKey)(
          'TODO(#11782): vet delegated plan',
          planOrSteps,
        );
        vetNoNewPositions(portfolioPlanner.getTargetAllocation(), planOrSteps);
        portfolioPlanner.submitVersion(
          delegatedRebalanceParams.syncState.policyVersion,
          delegatedRebalanceParams.syncState.rebalanceCount,
        );
        portfolioPlanner.resolveFlowPlan(flowId, planOrSteps);
        return flowKey;
      },
      /**
       * Claim rewards, and swap them, through the planner's delegation, with
       * a plan selecting attestor-signed evidence, which the delegation
       * verifies and vets like that of any other agent.
       */
      async claimRewards(
        portfolioId: number,
        delegatedClaimRewardsParams: PortfolioDelegatedClaimRewardsParams,
      ): Promise<FlowKey> {
        const portfolioPlanner = getPortfolioPlanner(portfolioId);
        const delegationClient = getPlannerDelegation(portfolioPlanner);
        assert(
          delegationClient && delegationClient.getReader().isActive(),
          `planner delegation must be active for portfolio ${portfolioId}`,
        );

        const autoFeatures = delegationClient.getReader().getAutoFeatures();
        assert(
          autoFeatures?.claimRewards,
          `portfolio ${portfolioId} auto-feature "claimRewards" must be enabled`,
        );

        // The delegation resolves the flow's plan with its bound steps, and
        // records its submission (see `submitVersion`).
        return delegationClient.claimRewards(delegatedClaimRewardsParams);
      },
    },
    {
      stateShape: { etc: M.any() },
    },
  );
};

export type PortfolioPlanner = ReturnType<ReturnType<typeof preparePlanner>>;
