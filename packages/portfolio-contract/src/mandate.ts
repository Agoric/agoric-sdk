/** @file Mandate and evidence checks for delegated portfolio operations. */
import {
  type FundsFlowPlan,
  type PlanAttestation,
  type PlanObservations,
  type PortfolioBalancePlaceRef,
  type PortfolioPermissions,
  type TargetAllocation,
} from '@agoric/portfolio-api';
import {
  isInstrumentId,
  isInterChainAccountRef,
} from '@agoric/portfolio-api/src/type-guards.js';
import { Fail } from '@endo/errors';
import { maxWeightClosure } from './max-weight-closure.ts';
import { fullOrder, makeSchedule } from './schedule-order.ts';
import type { MovementDesc } from './type-guards-steps.ts';

export const needsObservations = (
  permissions: PortfolioPermissions,
): boolean => {
  const { allocation } = permissions;
  return (
    typeof allocation === 'object' &&
    (allocation.minVaultTvlUsd !== undefined ||
      allocation.maxVaultShareBps !== undefined)
  );
};
harden(needsObservations);

/**
 * Check a proposed allocation against the current delegation permissions.
 * All checks run before policy mutation or flow creation.
 */
export const assertMandateForAllocation = (
  permissions: PortfolioPermissions,
  targetAllocation: TargetAllocation,
): void => {
  const allocation = permissions.allocation;
  if (typeof allocation !== 'object') return;
  const { maxWeightBps } = allocation;
  if (maxWeightBps === undefined) return;
  const totalPortions = Object.values(targetAllocation).reduce(
    (sum, portion = 0n) => sum + portion,
    0n,
  );
  const maxScaledPortion = maxWeightBps * totalPortions;

  for (const [instrument, portion = 0n] of Object.entries(targetAllocation)) {
    if (isInterChainAccountRef(instrument)) continue;
    totalPortions > 0n || Fail`mandate.maxWeight.zeroTotal:${instrument}`;
    portion * 10_000n <= maxScaledPortion ||
      Fail`mandate.maxWeight:${instrument}`;
  }
};
harden(assertMandateForAllocation);

const MICRO_USDC_PER_USD = 1_000_000n;

/**
 * Check observation-dependent limits against the evidence attached to a plan.
 * The observations are planner assertions, not independent attestations.
 */
export const assertMandateForPlanObservations = (
  permissions: PortfolioPermissions,
  targetAllocation: TargetAllocation,
  observations: PlanObservations,
): void => {
  const allocation = permissions.allocation;
  if (typeof allocation !== 'object') return;
  const { minVaultTvlUsd, maxVaultShareBps } = allocation;
  if (minVaultTvlUsd === undefined && maxVaultShareBps === undefined) return;
  const totalPortions = Object.values(targetAllocation).reduce(
    (sum, portion = 0n) => sum + portion,
    0n,
  );
  const portfolioValueMicroUsd = Object.values(observations.balances).reduce(
    (sum, balance = 0n) => sum + balance,
    0n,
  );

  for (const [instrument, portion = 0n] of Object.entries(targetAllocation)) {
    if (isInterChainAccountRef(instrument) || portion === 0n) continue;

    const status = observations.instrumentTvls[instrument];
    status || Fail`mandate.instrumentData.missing:${instrument}`;
    if (minVaultTvlUsd !== undefined) {
      status.tvlUsd >= minVaultTvlUsd ||
        Fail`mandate.minVaultTvl:${instrument}`;
    }
    if (maxVaultShareBps !== undefined) {
      totalPortions > 0n || Fail`mandate.maxVaultShare.zeroTotal:${instrument}`;
      portfolioValueMicroUsd * portion * 10_000n <=
        status.tvlUsd *
          MICRO_USDC_PER_USD *
          totalPortions *
          BigInt(maxVaultShareBps) || Fail`mandate.maxVaultShare:${instrument}`;
    }
  }
};
harden(assertMandateForPlanObservations);

/** Reject plans that send funds to positions absent from the target allocation. */
export const vetNoNewPositions = (
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
harden(vetNoNewPositions);

/** Reject plans whose swap outputs cannot be valued by mandate checks. */
export const vetNoSwaps = (
  planOrSteps: FundsFlowPlan | MovementDesc[],
): void => {
  const steps = Array.isArray(planOrSteps) ? planOrSteps : planOrSteps.flow;
  for (const { swap } of steps) {
    !swap || Fail`customer-routed plan does not support swap`;
  }
};
harden(vetNoSwaps);

/** Require exactly one balance for every current or plan-referenced place. */
export const vetObservationPlaces = (
  currentPlaces: Iterable<PortfolioBalancePlaceRef>,
  plan: FundsFlowPlan,
  observations: PlanObservations,
): void => {
  const expected = new Set(currentPlaces);
  for (const { src, dest } of plan.flow) {
    for (const place of [src, dest]) {
      if (isInstrumentId(place) || isInterChainAccountRef(place)) {
        expected.add(place);
      }
    }
  }

  const observed = new Set(Object.keys(observations.balances));
  for (const place of expected) {
    observed.has(place) || Fail`missing balance observation for ${place}`;
  }
  for (const place of observed) {
    expected.has(place as PortfolioBalancePlaceRef) ||
      Fail`unexpected balance observation for ${place}`;
  }
};
harden(vetObservationPlaces);

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
 *
 * Let S be the number of plan steps, D the number of distinct dependency
 * edges, and I the number of referenced instruments. This runs one
 * maximum-weight closure per instrument, for O(I * S * (S + D)^2) worst-case
 * time and O(S^2) peak space, excluding bigint arithmetic. With the default
 * linear order D is O(S), so the time bound is O(I * S^3); a dense explicit
 * order can raise it to O(I * S^5).
 *
 * The closure graph is rebuilt synchronously for each instrument. Keep
 * admitted plan sizes and instrument counts bounded, and benchmark this path
 * before increasing either limit materially.
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

  for (const { dest, claimRewards } of flow) {
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
  // TODO: Decide where the product should permit swap-bearing plans. Mandate
  // analysis cannot soundly project a swap without its output value.
  vetNoSwaps(plan);
  vetNoNewPositions(targetAllocation, plan);
  const balances = projectPlanBalances(plan, observations);
  vetAllocationCeilings(balances, targetAllocation);
  vetPartialPlanAllocation(targetAllocation, plan, observations);
};
harden(vetPlanAllocation);

/**
 * Vet a target allocation and optional execution plan against delegated
 * permissions and attested observations.
 *
 * @returns Whether the target allocation can be committed immediately. `false`
 * means observation-dependent permissions require a later plan.
 * @throws {Error} if the allocation, plan, attestation, or observations violate
 * the delegated permissions
 */
export const vetAllocationPlan = (
  permissions: PortfolioPermissions,
  targetAllocation: TargetAllocation,
  plan: FundsFlowPlan | undefined,
  attestation: PlanAttestation | undefined,
): boolean => {
  assertMandateForAllocation(permissions, targetAllocation);
  if (!plan) return !needsObservations(permissions);

  const { observations } =
    attestation ?? Fail`customer-supplied plans require an attestation`;
  vetPlanAllocation(targetAllocation, plan, observations);
  assertMandateForPlanObservations(permissions, targetAllocation, observations);
  return true;
};
harden(vetAllocationPlan);
