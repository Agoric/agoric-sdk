/** @file Delegation limits and evidence checks for delegated portfolio operations. */
import {
  type FundsFlowPlan,
  type InstrumentId,
  type InterChainAccountRef,
  type PlanObservations,
  type PortfolioBalancePlaceRef,
  type PortfolioPermissions,
  type TargetAllocation,
} from '@agoric/portfolio-api';
import { chainOf } from '@agoric/portfolio-api/src/places.js';
import {
  isInstrumentId,
  isInterChainAccountRef,
  isPortfolioBalancePlaceRef,
} from '@agoric/portfolio-api/src/type-guards.js';
import { Fail, q } from '@endo/errors';
import { maxWeightClosure } from './max-weight-closure.ts';
import { fullOrder, makeDependencies, makeSchedule } from './schedule-order.ts';
import type { MovementDesc } from './type-guards-steps.ts';

const { entries, keys, values } = Object;

/** Whether allocation permissions include limits that require portfolio observations. */
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

/** Sum bigints, treating omitted values as zero. */
const sumOptionalBigints = (bigints: Array<bigint | undefined>): bigint =>
  bigints.reduce<bigint>((sum, value = 0n) => sum + value, 0n);

/** Sum allocation portions, treating omitted portions as zero. */
const sumPortions = (targetAllocation: TargetAllocation): bigint =>
  sumOptionalBigints(values(targetAllocation));

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
  const totalPortions = sumPortions(targetAllocation);
  const maxScaledPortion = maxWeightBps * totalPortions;

  for (const [instrument, portion = 0n] of entries(targetAllocation)) {
    if (isInterChainAccountRef(instrument)) continue;
    totalPortions > 0n || Fail`mandate.maxWeight.zeroTotal:${q(instrument)}`;
    portion * 10_000n <= maxScaledPortion ||
      Fail`mandate.maxWeight:${q(instrument)}: portion ${q(portion)} of total ${q(totalPortions)} exceeds maxWeightBps ${q(maxWeightBps)}`;
  }
};
harden(assertMandateForAllocation);

const MICRO_USDC_PER_USD = 1_000_000n;

/**
 * Check observation-dependent limits against the evidence attached to a plan.
 * Observation authentication is the caller's responsibility.
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
  const totalPortions = sumPortions(targetAllocation);
  const portfolioValueMicroUsd = sumOptionalBigints(
    values(observations.balances),
  );

  for (const [instrument, portion = 0n] of entries(targetAllocation)) {
    if (isInterChainAccountRef(instrument) || portion === 0n) continue;

    const status = observations.instrumentTvls[instrument];
    status || Fail`mandate.instrumentData.missing:${q(instrument)}`;
    if (minVaultTvlUsd !== undefined) {
      status.tvlUsd >= minVaultTvlUsd ||
        Fail`mandate.minVaultTvl:${q(instrument)}: tvlUsd ${q(status.tvlUsd)} is below minVaultTvlUsd ${q(minVaultTvlUsd)}`;
    }
    if (maxVaultShareBps !== undefined) {
      totalPortions > 0n ||
        Fail`mandate.maxVaultShare.zeroTotal:${q(instrument)}`;
      portfolioValueMicroUsd * portion * 10_000n <=
        status.tvlUsd *
          MICRO_USDC_PER_USD *
          totalPortions *
          BigInt(maxVaultShareBps) ||
        Fail`mandate.maxVaultShare:${q(instrument)}: portion ${q(portion)} of total ${q(totalPortions)} with portfolio value ${q(portfolioValueMicroUsd)} micro-USD exceeds maxVaultShareBps ${q(maxVaultShareBps)} of vault tvlUsd ${q(status.tvlUsd)}`;
    }
  }
};
harden(assertMandateForPlanObservations);

/** Reject plans that send funds to positions absent from the target allocation. */
export const vetNoNewPositions = (
  targetAllocation: TargetAllocation = {},
  planOrSteps: FundsFlowPlan | MovementDesc[],
) => {
  const allowedPositions = keys(targetAllocation);
  const steps = Array.isArray(planOrSteps) ? planOrSteps : planOrSteps.flow;
  const destinations = [...new Set(steps.map(step => step.dest))];
  const unexpected = destinations.filter(
    dest => isInstrumentId(dest) && !allowedPositions.includes(dest),
  );
  unexpected.length === 0 || Fail`plan cannot add positions: ${q(unexpected)}`;
};
harden(vetNoNewPositions);

/** Reject plans whose swap outputs cannot be valued by mandate checks. */
export const vetNoSwaps = (
  planOrSteps: FundsFlowPlan | MovementDesc[],
): void => {
  const steps = Array.isArray(planOrSteps) ? planOrSteps : planOrSteps.flow;
  for (const { swap } of steps) {
    !swap || Fail`allocation plan does not support swap`;
  }
};
harden(vetNoSwaps);

/**
 * Closed operations for mandate analysis. Reward claims have no USDC amount.
 *
 * XXX Move the operation union and decoder to `@agoric/portfolio-api`. Extend
 * the variants for execution's supply, withdrawal, transfer, and swap routes.
 * portfolio.flows.ts's wayFromSrcToDest() and makeEVMProtocolStep(), delegated
 * submission validation, and planner producers should share that decoding
 * boundary instead of independently interpreting optional movement fields.
 * Preserve extensibility at the wire boundary; reject unsupported semantics
 * before producing a closed internal operation.
 */
type PlanOperation =
  | {
      kind: 'move';
      src: PortfolioBalancePlaceRef;
      dest: PortfolioBalancePlaceRef;
      amount: MovementDesc['amount'];
    }
  | {
      kind: 'claimRewards';
      src: InstrumentId;
      dest: InterChainAccountRef;
      claimRewards: NonNullable<MovementDesc['claimRewards']>;
    };

type DecodedPlan = Omit<FundsFlowPlan, 'flow'> & { flow: PlanOperation[] };

/** Decode once so every balance check uses the same operation semantics. */
const decodePlan = (plan: FundsFlowPlan): DecodedPlan => {
  // Swap output values are not yet available to mandate analysis.
  vetNoSwaps(plan);
  const flow = plan.flow.map((movement): PlanOperation => {
    const { src, dest, amount, claimRewards } = movement;
    if (!isPortfolioBalancePlaceRef(src)) {
      throw Fail`allocation plan does not support deposit or withdrawal place ${q(src)}`;
    }
    if (!isPortfolioBalancePlaceRef(dest)) {
      throw Fail`allocation plan does not support deposit or withdrawal place ${q(dest)}`;
    }
    src !== dest ||
      Fail`allocation plan does not support self-movement at ${q(src)}`;
    if (!claimRewards) return { kind: 'move', src, dest, amount };

    if (
      !isInstrumentId(src) ||
      !isInterChainAccountRef(dest) ||
      dest !== `@${chainOf(src)}`
    ) {
      throw Fail`claimRewards requires an instrument source and its chain account destination: ${q(src)} -> ${q(dest)}`;
    }
    return { kind: 'claimRewards', src, dest, claimRewards };
  });
  return harden({
    flow,
    ...(plan.order !== undefined && { order: plan.order }),
  });
};

/** Require every current or plan-referenced balance; allow only zero-balance extras. */
export const vetObservationPlaces = (
  currentPlaces: Iterable<PortfolioBalancePlaceRef>,
  plan: FundsFlowPlan,
  observations: PlanObservations,
): void => {
  const expected = new Set(currentPlaces);
  for (const place of new Set(
    plan.flow.flatMap(step => [step.src, step.dest]),
  )) {
    if (isInstrumentId(place) || isInterChainAccountRef(place)) {
      expected.add(place);
    }
  }

  const observed = new Set(
    keys(observations.balances) as PortfolioBalancePlaceRef[],
  );
  const missing = [...expected].filter(place => !observed.has(place));
  missing.length === 0 || Fail`missing balance observation for ${q(missing)}`;
  // Nonzero extras would inflate the portfolio total used by mandate checks.
  const extra = [...observed].filter(
    place => !expected.has(place) && observations.balances[place] !== 0n,
  );
  extra.length === 0 || Fail`unexpected balance observation for ${q(extra)}`;
};
harden(vetObservationPlaces);

/** Reject a balance projection whose instrument shares exceed their target ceilings. */
const vetAllocationCeilings = (
  balances: Map<string, bigint>,
  targetAllocation: TargetAllocation,
) => {
  const totalBalance = sumOptionalBigints([...balances.values()]);
  const totalPortions = sumPortions(targetAllocation);
  for (const [place, balance] of balances.entries()) {
    if (!isInstrumentId(place) || balance === 0n) continue;
    totalPortions > 0n || Fail`plan target allocation has zero total`;
    const ceiling = targetAllocation[place] ?? 0n;
    balance * totalPortions <= totalBalance * ceiling ||
      Fail`plan final balance exceeds target allocation at ${q(place)}: balance ${q(balance)} of total ${q(totalBalance)} vs target portion ${q(ceiling)} of ${q(totalPortions)}`;
  }
};

/**
 * Reject a plan when partial failure could increase a position balance above
 * both its target allocation ceiling and its initial balance.
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
  plan: DecodedPlan,
  observations: PlanObservations,
) => {
  const initialBalances = new Map<string, bigint>(
    entries(observations.balances).map(([place, balance]) => [
      place,
      balance ?? 0n,
    ]),
  );
  const totalBalance = sumOptionalBigints([...initialBalances.values()]);
  const totalPortions = sumPortions(targetAllocation);
  const { flow } = plan;
  const steps = [...flow.keys()];
  const dependencies = makeDependencies(
    flow.length,
    plan.order ?? fullOrder(flow.length),
  );
  const instruments = new Set(
    [
      ...keys(targetAllocation),
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
        if (movement.kind === 'claimRewards') return 0n;
        const { src, dest, amount } = movement;
        if (dest === place) return amount.value;
        if (src === place) return -amount.value;
        return 0n;
      },
      index => [...(dependencies.get(index) ?? [])],
    );
    const maxBalance = initialBalance + maxDelta;
    const ceiling = targetAllocation[place] ?? 0n;
    const withinTarget =
      totalPortions > 0n &&
      maxBalance * totalPortions <= totalBalance * ceiling;
    withinTarget ||
      maxBalance <= initialBalance ||
      Fail`plan intermediate balance exceeds target allocation at ${q(place)}: initial balance ${q(initialBalance)}, peak balance ${q(maxBalance)} of total ${q(totalBalance)} vs target portion ${q(ceiling)} of ${q(totalPortions)}`;
  }
};

/**
 * Simulate dependency-ordered execution to calculate final balances.
 *
 * Reward claims do not change the projected balances.
 *
 * @throws {Error} if a destination position lacks an observed starting balance
 * @throws {Error} if a concurrently ready group lacks sufficient funds
 */
const projectPlanBalances = (
  plan: DecodedPlan,
  observations: PlanObservations,
): Map<string, bigint> => {
  const balances = new Map<string, bigint>(
    entries(observations.balances).map(([place, balance]) => [
      place,
      balance ?? 0n,
    ]),
  );
  const { flow } = plan;
  const schedule = makeSchedule({
    taskQty: flow.length,
    order: plan.order ?? fullOrder(flow.length),
  });

  for (const { dest, kind } of flow) {
    if (kind === 'claimRewards') continue;
    if (isInstrumentId(dest)) {
      observations.balances[dest] !== undefined ||
        Fail`missing balance observation for ${q(dest)}`;
    }
  }

  while (schedule.pending()) {
    const ready = schedule.ready();

    const debits = new Map<string, bigint>();
    for (const ix of ready) {
      const movement = flow[ix];
      if (!movement || movement.kind === 'claimRewards') continue;
      debits.set(
        movement.src,
        (debits.get(movement.src) ?? 0n) + movement.amount.value,
      );
    }
    for (const [src, debit] of debits.entries()) {
      const balance = balances.get(src) ?? 0n;
      balance >= debit ||
        Fail`unfunded plan movement from ${q(src)}: balance ${q(balance)} < debit ${q(debit)}`;
    }

    for (const ix of ready) {
      const movement = flow[ix];
      if (!movement || movement.kind === 'claimRewards') continue;
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
 * Reject plans that claim rewards, add positions, finish above target ceilings,
 * or whose partial failure could increase a position balance above both its
 * target allocation ceiling and its initial balance.
 */
export const vetPlanAllocation = (
  targetAllocation: TargetAllocation,
  plan: FundsFlowPlan,
  observations: PlanObservations,
): void => {
  const decodedPlan = decodePlan(plan);
  for (const { kind } of decodedPlan.flow) {
    kind !== 'claimRewards' ||
      Fail`allocation plan does not support claimRewards`;
  }
  // TODO(AGO-1303): Enforce on-chain fee limits, including repeated submissions:
  // https://linear.app/agoric/issue/AGO-1303/on-chain-fee-rate-limit
  // Agent-selected fees spend from the shared contract account. Fee protection
  // is deferred during controlled ymax0 testing; enforce it before opening
  // plan submission to untrusted agents.
  vetNoNewPositions(targetAllocation, plan);
  const balances = projectPlanBalances(decodedPlan, observations);
  vetAllocationCeilings(balances, targetAllocation);
  vetPartialPlanAllocation(targetAllocation, decodedPlan, observations);
};
harden(vetPlanAllocation);

/**
 * Vet a target allocation and optional execution plan against delegated
 * permissions and the attested observations of the portfolio.
 *
 * @returns Whether the target allocation can be committed immediately. `false`
 * means observation-dependent permissions require a later plan.
 * @throws {Error} if the allocation, plan, or observations violate the
 * delegated permissions, or if a plan lacks observations
 */
export const vetAllocationPlan = (
  permissions: PortfolioPermissions,
  targetAllocation: TargetAllocation,
  plan: FundsFlowPlan | undefined,
  observations: PlanObservations | undefined,
): boolean => {
  assertMandateForAllocation(permissions, targetAllocation);
  if (!plan) return !needsObservations(permissions);

  if (!observations) throw Fail`allocation plan requires observations`;
  vetPlanAllocation(targetAllocation, plan, observations);
  assertMandateForPlanObservations(permissions, targetAllocation, observations);
  return true;
};
harden(vetAllocationPlan);
