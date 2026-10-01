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
  type PlanObservations,
  type PortfolioDelegatedClaimRewardsParams,
  type PortfolioDelegatedRebalanceParams,
  type TargetAllocation,
} from '@agoric/portfolio-api';
import { isInstrumentId } from '@agoric/portfolio-api/src/type-guards.js';
import type { Zone } from '@agoric/zone';
import { Fail } from '@endo/errors';
import { M } from '@endo/patterns';
import type { PortfolioDelegationClient } from './delegation.exo.ts';
import { maxWeightClosure } from './max-weight-closure.ts';
import type { PortfolioKit } from './portfolio.exo.ts';
import { fullOrder, makeSchedule } from './schedule-order.ts';
import type { MovementDesc } from './type-guards-steps.ts';
import { makeOfferArgsShapes } from './type-guards-steps.ts';
import {
  flowIdFromKey,
  FlowKeyShape,
  PlanObservationsShape,
} from './type-guards.ts';

const trace = makeTracer('PPLN');

/** Reject plans that send funds to positions absent from the target allocation. */
const vetNoNewPositions = (
  targetAllocation: TargetAllocation,
  planOrSteps: FundsFlowPlan | MovementDesc[],
) => {
  const allowedPositions = Object.keys(targetAllocation);
  const steps = Array.isArray(planOrSteps) ? planOrSteps : planOrSteps.flow;
  const destinations = [...new Set(steps.map(({ dest }) => dest))];
  const unexpected = destinations.filter(
    dest => isInstrumentId(dest) && !allowedPositions.includes(dest),
  );
  unexpected.length === 0 ||
    Fail`planner cannot add positions: ${unexpected.join(', ')}`;
};

/** Reject a balance projection whose instrument shares exceed their target ceilings. */
const vetAllocationCeilings = (
  balances: Map<string, bigint>,
  targetAllocation: TargetAllocation,
) => {
  const totalBalance = [...balances.values()].reduce(
    (total, balance) => total + balance,
    0n,
  );
  const totalPortions = Object.values(targetAllocation).reduce(
    (total, portion = 0n) => total + portion,
    0n,
  );
  for (const [place, balance] of balances.entries()) {
    if (!isInstrumentId(place) || balance === 0n) continue;
    totalPortions > 0n || Fail`plan target allocation has zero total`;
    const ceiling = targetAllocation[place] ?? 0n;
    balance * totalPortions <= totalBalance * ceiling ||
      Fail`plan exceeds target allocation at ${place}`;
  }
};

/**
 * Reject a plan when partial failure could leave an instrument above both its
 * target ceiling and initial share.
 */
const vetPartialPlanAllocation = (
  targetAllocation: TargetAllocation,
  plan: FundsFlowPlan,
  observations: PlanObservations,
) => {
  const initialBalances = new Map<string, bigint>(
    Object.entries(observations.balances).map(([place, balance]) => [
      place,
      balance ?? 0n,
    ]),
  );
  const totalBalance = [...initialBalances.values()].reduce(
    (total, balance) => total + balance,
    0n,
  );
  const totalPortions = Object.values(targetAllocation).reduce(
    (total, portion = 0n) => total + portion,
    0n,
  );
  const { flow } = plan;
  const steps = [...flow.keys()];
  const dependencies = new Map(plan.order ?? fullOrder(flow.length));
  const instruments = new Set(
    [
      ...Object.keys(targetAllocation),
      ...initialBalances.keys(),
      ...flow.flatMap(({ src, dest }) => [src, dest]),
    ].filter(isInstrumentId),
  );

  for (const place of instruments) {
    const initialBalance = initialBalances.get(place) ?? 0n;
    const maxDelta = maxWeightClosure(
      steps,
      index => {
        const movement = flow[index]!;
        if (movement.claimRewards) return 0n;
        const { src, dest, amount } = movement;
        return (
          (dest === place ? amount.value : 0n) -
          (src === place ? amount.value : 0n)
        );
      },
      index => dependencies.get(index) ?? [],
    );
    const maxBalance = initialBalance + maxDelta;
    const ceiling = targetAllocation[place] ?? 0n;
    const withinTarget =
      totalPortions > 0n &&
      maxBalance * totalPortions <= totalBalance * ceiling;
    withinTarget ||
      maxBalance <= initialBalance ||
      Fail`plan exceeds target allocation at ${place}`;
  }
};

/**
 * Simulate dependency-ordered execution to calculate final balances.
 *
 * Reward claims do not change the projected balances.
 *
 * @throws {Error} if a swap is present because its output value cannot be
 * projected from the movement amount
 * @throws {Error} if a destination position lacks an observed starting balance
 * @throws {Error} if a concurrently ready group lacks sufficient funds
 */
const projectPlanBalances = (
  plan: FundsFlowPlan,
  observations: PlanObservations,
): Map<string, bigint> => {
  const balances = new Map<string, bigint>(
    Object.entries(observations.balances).map(([place, balance]) => [
      place,
      balance ?? 0n,
    ]),
  );
  const { flow } = plan;
  const schedule = makeSchedule({
    taskQty: flow.length,
    order: plan.order ?? fullOrder(flow.length),
  });

  for (const { dest, claimRewards, swap } of flow) {
    // TODO: Decide where the product should permit swap-bearing plans. Keeping
    // this check here makes otherwise-general allocation vetting reject them.
    !swap || Fail`customer-routed plan does not support swap`;
    if (claimRewards) continue;
    if (isInstrumentId(dest)) {
      observations.balances[dest] !== undefined ||
        Fail`missing balance observation for ${dest}`;
    }
  }

  while (schedule.pending()) {
    const ready = schedule.ready();

    const debits = new Map<string, bigint>();
    for (const ix of ready) {
      const movement = flow[ix];
      if (!movement || movement.claimRewards) continue;
      debits.set(
        movement.src,
        (debits.get(movement.src) ?? 0n) + movement.amount.value,
      );
    }
    for (const [src, debit] of debits.entries()) {
      const balance = balances.get(src) ?? 0n;
      balance >= debit || Fail`unfunded plan movement from ${src}`;
    }

    for (const ix of ready) {
      const movement = flow[ix];
      if (!movement || movement.claimRewards) continue;
      const { src, dest, amount } = movement;
      balances.set(src, (balances.get(src) ?? 0n) - amount.value);
      balances.set(dest, (balances.get(dest) ?? 0n) + amount.value);
    }
    for (const ix of ready) {
      schedule.complete(ix);
    }
  }

  return balances;
};

/**
 * Reject plans that add positions, finish above target ceilings, or whose
 * partial failure could increase an instrument above both its target ceiling
 * and initial share.
 */
export const vetPlanAllocation = (
  targetAllocation: TargetAllocation,
  plan: FundsFlowPlan,
  observations: PlanObservations,
): void => {
  vetNoNewPositions(targetAllocation, plan);
  const balances = projectPlanBalances(plan, observations);
  vetAllocationCeilings(balances, targetAllocation);
  vetPartialPlanAllocation(targetAllocation, plan, observations);
};
harden(vetPlanAllocation);

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
      .optional(rebalanceCountShape, PlanObservationsShape)
      .returns(),
    rejectPlan: M.call(portfolioIdShape, flowIdShape, M.string())
      .optional(policyVersionShape, rebalanceCountShape)
      .returns(),
    rebalance: M.call(
      portfolioIdShape,
      PortfolioDelegatedRebalanceParamsShape,
      planCompatShape,
    ).returns(FlowKeyShape),
    claimRewards: M.call(
      portfolioIdShape,
      PortfolioDelegatedClaimRewardsParamsShape,
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
        observations?: PlanObservations,
      ) {
        const traceFlow = trace
          .sub(`portfolio${portfolioId}`)
          .sub(`flow${flowId}`);
        traceFlow('TODO(#11782): vet plan', planOrSteps);
        const portfolioPlanner = getPortfolioPlanner(portfolioId);
        vetNoNewPositions(
          portfolioPlanner.getTargetAllocation() ?? {},
          planOrSteps,
        );
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
        vetNoNewPositions(
          portfolioPlanner.getTargetAllocation() ?? {},
          planOrSteps,
        );
        portfolioPlanner.submitVersion(
          delegatedRebalanceParams.syncState.policyVersion,
          delegatedRebalanceParams.syncState.rebalanceCount,
        );
        portfolioPlanner.resolveFlowPlan(flowId, planOrSteps);
        return flowKey;
      },
      claimRewards(
        portfolioId: number,
        delegatedClaimRewardsParams: PortfolioDelegatedClaimRewardsParams,
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
          autoFeatures?.claimRewards,
          `portfolio ${portfolioId} auto-feature "claimRewards" must be enabled`,
        );

        // The flow created by claimRewards is guaranteed to have its plan
        // sync kit fully ready.
        const flowKey = delegationClient.claimRewards(
          delegatedClaimRewardsParams,
        );
        const flowId = flowIdFromKey(flowKey);
        trace.sub(`portfolio${portfolioId}`).sub(flowKey)(
          'TODO(#11782): vet delegated plan',
          planOrSteps,
        );
        vetNoNewPositions(
          portfolioPlanner.getTargetAllocation() ?? {},
          planOrSteps,
        );
        portfolioPlanner.submitVersion(
          delegatedClaimRewardsParams.syncState.policyVersion,
          delegatedClaimRewardsParams.syncState.rebalanceCount,
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
