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
import { Fail } from '@endo/errors';
import { fullOrder, makeSchedule } from './schedule-order.ts';
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
    totalPortions > 0n || Fail`mandate.maxWeight.zeroTotal:${instrument}`;
    portion * 10_000n <= maxScaledPortion ||
      Fail`mandate.maxWeight:${instrument}`;
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
  targetAllocation: TargetAllocation = {},
  planOrSteps: FundsFlowPlan | MovementDesc[],
) => {
  const allowedPositions = keys(targetAllocation);
  const steps = Array.isArray(planOrSteps) ? planOrSteps : planOrSteps.flow;
  const destinations = [...new Set(steps.map(step => step.dest))];
  const unexpected = destinations.filter(
    dest => isInstrumentId(dest) && !allowedPositions.includes(dest),
  );
  unexpected.length === 0 ||
    Fail`plan cannot add positions: ${unexpected.join(', ')}`;
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
      throw Fail`allocation plan does not support deposit or withdrawal place ${src}`;
    }
    if (!isPortfolioBalancePlaceRef(dest)) {
      throw Fail`allocation plan does not support deposit or withdrawal place ${dest}`;
    }
    src !== dest ||
      Fail`allocation plan does not support self-movement at ${src}`;
    if (!claimRewards) return { kind: 'move', src, dest, amount };

    if (
      !isInstrumentId(src) ||
      !isInterChainAccountRef(dest) ||
      dest !== `@${chainOf(src)}`
    ) {
      throw Fail`claimRewards requires an instrument source and its chain account destination: ${src} -> ${dest}`;
    }
    return { kind: 'claimRewards', src, dest, claimRewards };
  });
  return harden({
    flow,
    ...(plan.order !== undefined && { order: plan.order }),
  });
};

/** Require exactly one balance for every current or plan-referenced place. */
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
  missing.length === 0 || Fail`missing balance observation for ${missing}`;
  const extra = [...observed].filter(place => !expected.has(place));
  extra.length === 0 || Fail`unexpected balance observation for ${extra}`;
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
      Fail`plan exceeds target allocation at ${place}`;
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
        Fail`missing balance observation for ${dest}`;
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
      balance >= debit || Fail`unfunded plan movement from ${src}`;
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
 * Reject plans that claim rewards, add positions, or finish above target
 * ceilings.
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
