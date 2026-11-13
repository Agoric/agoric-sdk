/** @file Delegation limits and evidence checks for delegated portfolio operations. */
import {
  type FundsFlowPlan,
  type MovementDesc,
  type InstrumentId,
  type InterChainAccountRef,
  type PlanObservations,
  type PortfolioBalancePlaceRef,
  type PortfolioPermissions,
  type TargetAllocation,
  type TypedHoldingDetail,
} from '@agoric/portfolio-api';
import {
  chainOf,
  type ERC4626InstrumentId,
} from '@agoric/portfolio-api/src/places.js';
import {
  isERC4626MorphoInstrumentId,
  isInstrumentId,
  isInterChainAccountRef,
  isPortfolioBalancePlaceRef,
} from '@agoric/portfolio-api/src/type-guards.js';
import type { Address as EvmAddress } from 'abitype';
import { b, Fail, q } from '@endo/errors';
import { vetInstrumentAccountChain } from './flow-plan-places.ts';
import { maxWeightClosure } from './max-weight-closure.ts';
import { fullOrder, makeDependencies, makeSchedule } from './schedule-order.ts';

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
 * Sum observed values by portfolio location, in micro-USD.
 * These values measure exposure; they do not establish spendable quantities.
 */
const sumValueUusdByPlace = (
  observations: PlanObservations,
): Map<PortfolioBalancePlaceRef, bigint> => {
  const { holdings, balances } = observations;
  if (!holdings?.length) {
    // Legacy micro-USDC balances are treated as micro-USD at parity.
    return new Map(
      entries(balances).map(([place, balance]) => [
        place as PortfolioBalancePlaceRef,
        balance ?? 0n,
      ]),
    );
  }
  const result = new Map<PortfolioBalancePlaceRef, bigint>();
  const legacyBalances = new Map<string, bigint>();
  for (const { place, valueUusd, balanceUsdc } of holdings) {
    if (valueUusd === undefined) {
      throw Fail`missing holding valuation for ${q(place)}`;
    }
    result.set(place, (result.get(place) ?? 0n) + valueUusd);
    if (balanceUsdc !== undefined) {
      legacyBalances.set(
        place,
        (legacyBalances.get(place) ?? 0n) + balanceUsdc,
      );
    }
  }
  // Transitional balances repeat the signed legacy fields; never count both.
  const given = entries(balances).filter(([, value]) => value !== undefined);
  if (given.length > 0) {
    (given.length === legacyBalances.size &&
      given.every(([place, value]) => legacyBalances.get(place) === value)) ||
      Fail`aggregate balances must match the balanceUsdc of observed holdings`;
  }
  return result;
};

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
  const portfolioValueUusd =
    maxVaultShareBps === undefined
      ? 0n
      : sumOptionalBigints([...sumValueUusdByPlace(observations).values()]);

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
      portfolioValueUusd * portion * 10_000n <=
        status.tvlUsd *
          MICRO_USDC_PER_USD *
          totalPortions *
          BigInt(maxVaultShareBps) ||
        Fail`mandate.maxVaultShare:${q(instrument)}: portion ${q(portion)} of total ${q(totalPortions)} with portfolio value ${q(portfolioValueUusd)} micro-USD exceeds maxVaultShareBps ${q(maxVaultShareBps)} of vault tvlUsd ${q(status.tvlUsd)}`;
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
      debitValueUusd: bigint;
    }
  | {
      kind: 'redeemShares';
      src: ERC4626InstrumentId;
      dest: InterChainAccountRef;
      /** Minimum destination quantity, not the quantity removed from src. */
      amount: MovementDesc['amount'];
      /** Micro-USD exposure removed from the source, independent of proceeds. */
      debitValueUusd: bigint;
      holding: TypedHoldingDetail & { valueUusd: bigint };
      shares: bigint;
    }
  | {
      kind: 'claimRewards';
      src: InstrumentId;
      dest: InterChainAccountRef;
      claimRewards: NonNullable<MovementDesc['claimRewards']>;
    };

type DecodedPlan = Omit<FundsFlowPlan, 'flow'> & { flow: PlanOperation[] };

/** Resolve USDC identity from contract configuration, not from observations. */
type GetUsdcAddress = (account: InterChainAccountRef) => EvmAddress | undefined;

type GetVaultAddress = (src: ERC4626InstrumentId) => EvmAddress | undefined;

/**
 * Decode once so every balance check uses the same operation semantics.
 * Legacy balance observations retain the existing exact-amount fallback.
 */
const decodePlan = (
  plan: FundsFlowPlan,
  observations: PlanObservations,
): DecodedPlan => {
  // Swap output values are not yet available to mandate analysis.
  vetNoSwaps(plan);
  const flow = plan.flow.map((movement): PlanOperation => {
    const { src, dest, amount, claimRewards, withdraw } = movement;
    if (!isPortfolioBalancePlaceRef(src)) {
      throw Fail`allocation plan does not support deposit or withdrawal place ${q(src)}`;
    }
    if (!isPortfolioBalancePlaceRef(dest)) {
      throw Fail`allocation plan does not support deposit or withdrawal place ${q(dest)}`;
    }
    src !== dest ||
      Fail`allocation plan does not support self-movement at ${q(src)}`;
    // The mandate checks below apply to the instrument named in the plan.
    // Execution would use the instrument on the account's chain, so the two
    // chains must match for those checks to cover what actually happens.
    vetInstrumentAccountChain(movement);
    if (
      (observations.holdings?.length && withdraw?.max === true) ||
      withdraw?.amountOfShares !== undefined
    ) {
      if (
        !isERC4626MorphoInstrumentId(src) ||
        !isInterChainAccountRef(dest) ||
        dest !== `@${chainOf(src)}`
      ) {
        throw Fail`share redemption requires a Morpho source and its chain account destination: ${q(src)} -> ${q(dest)}`;
      }
      if (claimRewards) {
        throw Fail`share redemption cannot also claim rewards at ${q(src)}`;
      }
      const candidates =
        observations.holdings?.filter(
          holding => holding.place === src && holding.kind === 'shares',
        ) ?? [];
      if (candidates.length !== 1) {
        throw Fail`share redemption requires one observed share holding at ${q(src)}; found ${q(candidates.length)}`;
      }
      const holding = candidates[0]!;
      const { valueUusd } = holding;
      if (valueUusd === undefined) {
        throw Fail`missing holding valuation for ${q(src)}`;
      }
      const shares = withdraw?.amountOfShares ?? holding.amount;
      shares <= holding.amount ||
        Fail`requested shares ${q(shares)} exceed observed shares ${q(holding.amount)} at ${q(src)}`;
      if (shares === 0n && amount.value > 0n) {
        throw Fail`empty share holding cannot meet proceeds minimum ${q(amount.value)} at ${q(src)}`;
      }
      return {
        kind: 'redeemShares',
        src,
        dest,
        amount,
        // Round down so the remaining source exposure is not understated.
        debitValueUusd:
          holding.amount === 0n ? 0n : (valueUusd * shares) / holding.amount,
        holding: { ...holding, valueUusd },
        shares,
      };
    }
    if (!claimRewards) {
      return {
        kind: 'move',
        src,
        dest,
        amount,
        debitValueUusd: amount.value,
      };
    }

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

export type BoundShareWithdrawal = Readonly<{
  src: ERC4626InstrumentId;
  vaultAddress: EvmAddress;
  shares: bigint;
}>;

/** Derive execution instructions from the same operations used by allocation checks. */
const bindShareWithdrawals = (
  plan: DecodedPlan,
  getVaultAddress?: GetVaultAddress,
): Partial<Record<number, BoundShareWithdrawal>> => {
  const bound: Partial<Record<number, BoundShareWithdrawal>> = {};
  for (const [step, movement] of plan.flow.entries()) {
    if (movement.kind !== 'redeemShares') continue;
    const vaultAddress = getVaultAddress?.(movement.src);
    if (!vaultAddress) {
      throw Fail`no configured vault for ${q(movement.src)}`;
    }
    movement.holding.tokenId?.toLowerCase() === vaultAddress.toLowerCase() ||
      Fail`observed share token ${q(movement.holding.tokenId)} does not match configured vault ${q(vaultAddress)} at ${q(movement.src)}`;
    if (movement.amount.value > 0n) {
      throw Fail`share redemption cannot yet enforce a positive proceeds minimum ${q(movement.amount.value)} at ${q(movement.src)}`;
    }
    bound[step] = {
      src: movement.src,
      vaultAddress,
      shares: movement.shares,
    };
  }
  return harden(bound);
};
harden(bindShareWithdrawals);

/** An investment requires principal or shares; rewards alone do not cover it. */
const hasObservedBalance = (
  place: PortfolioBalancePlaceRef,
  observations: PlanObservations,
): boolean => {
  if (!observations.holdings?.length) {
    return observations.balances[place] !== undefined;
  }
  return observations.holdings.some(
    ({ place: holdingPlace, kind }) =>
      holdingPlace === place &&
      (!isInstrumentId(place) || kind === 'principal' || kind === 'shares'),
  );
};

/** Require every current or plan-referenced place; allow only known-empty extras. */
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

  const holdings = observations.holdings ?? [];
  const missing = [...expected].filter(
    place => !hasObservedBalance(place, observations),
  );
  missing.length === 0 || Fail`missing balance observation for ${q(missing)}`;
  // Do not omit raw quantities or unknown valuations from the evidence check.
  const nonempty = new Set<PortfolioBalancePlaceRef>([
    ...entries(observations.balances)
      .filter(([, balance]) => balance !== 0n)
      .map(([place]) => place as PortfolioBalancePlaceRef),
    ...holdings
      .filter(({ amount, valueUusd }) => amount !== 0n || valueUusd !== 0n)
      .map(({ place }) => place),
  ]);
  const extra = [...nonempty].filter(place => !expected.has(place));
  extra.length === 0 || Fail`unexpected balance observation for ${q(extra)}`;
};
harden(vetObservationPlaces);

/**
 * Target-allocation slack in micro-USDC, shared across all instruments on the
 * same chain.
 * Matches a historical 1 USDC cross-chain transfer minimum.
 */
const MAX_CHAIN_ALLOCATION_DIVERGENCE_UUSDC = 1_000_000n;
const MAX_CHAIN_ALLOCATION_DIVERGENCE_LABEL = '1 USDC';

/**
 * Allow at most {@link MAX_CHAIN_ALLOCATION_DIVERGENCE_UUSDC} of total positive
 * instrument excess per chain.
 */
const vetAllocationCeilings = (
  balances: Map<string, bigint>,
  targetAllocation: TargetAllocation,
) => {
  const totalBalance = sumOptionalBigints([...balances.values()]);
  const totalPortions = sumPortions(targetAllocation);
  const excessByChain = new Map<string, bigint>();
  for (const [place, balance] of balances.entries()) {
    if (!isInstrumentId(place) || balance === 0n) continue;
    totalPortions > 0n || Fail`plan target allocation has zero total`;
    const ceiling = targetAllocation[place] ?? 0n;
    // Scale by portions to preserve fractional ceilings; deficits give no credit.
    const excess = balance * totalPortions - totalBalance * ceiling;
    if (excess <= 0n) continue;
    const chain = chainOf(place);
    const chainExcess = (excessByChain.get(chain) ?? 0n) + excess;
    excessByChain.set(chain, chainExcess);
    chainExcess <= MAX_CHAIN_ALLOCATION_DIVERGENCE_UUSDC * totalPortions ||
      Fail`plan final balance exceeds target allocation at ${q(place)}: balance ${q(balance)} of total ${q(totalBalance)} vs target portion ${q(ceiling)} of ${q(totalPortions)}; positive excess on ${q(chain)} exceeds the shared ${b(MAX_CHAIN_ALLOCATION_DIVERGENCE_LABEL)} divergence budget`;
  }
};

/**
 * Reject a plan when partial failure could increase a position balance above
 * both its target allocation ceiling and its initial balance. No dust allowance
 * applies here: adding slack to the observed initial balance would let repeated
 * partial failures ratchet exposure upward.
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
  const initialBalances = sumValueUusdByPlace(observations);
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
        if (src === place) return -movement.debitValueUusd;
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
  getUsdcAddress?: GetUsdcAddress,
): Map<string, bigint> => {
  const balances = sumValueUusdByPlace(observations);
  const remainingCash = new Map<InterChainAccountRef, bigint>();
  if (observations.holdings?.length) {
    for (const movement of plan.flow) {
      if (movement.kind !== 'move') continue;
      const { src } = movement;
      if (!isInterChainAccountRef(src)) {
        throw Fail`portfolio checks cannot yet project exact withdrawals from observed holdings at ${q(src)}`;
      }
      if (remainingCash.has(src)) continue;
      const usdcAddress = getUsdcAddress?.(src);
      if (!usdcAddress) throw Fail`no configured USDC token at ${q(src)}`;
      const candidates = observations.holdings.filter(
        holding =>
          holding.place === src &&
          holding.kind === 'token' &&
          holding.tokenId?.toLowerCase() === usdcAddress.toLowerCase(),
      );
      if (candidates.length !== 1) {
        throw Fail`cash movement requires one observed USDC holding at ${q(src)}`;
      }
      const holding = candidates[0]!;
      // Exact-movement exposure arithmetic currently assumes USDC at parity.
      // Reject other valuations rather than equating raw units with USD value.
      if (holding.valueUusd !== holding.amount) {
        throw Fail`cash movement requires one-for-one USDC valuation at ${q(src)}`;
      }
      remainingCash.set(src, holding.amount);
    }
  }
  const { flow } = plan;
  const remainingShares = new Map<InstrumentId, bigint>();
  for (const movement of flow) {
    if (movement.kind === 'redeemShares') {
      remainingShares.set(movement.src, movement.holding.amount);
    }
  }
  const schedule = makeSchedule({
    taskQty: flow.length,
    order: plan.order ?? fullOrder(flow.length),
  });

  for (const { dest, kind } of flow) {
    if (kind === 'claimRewards') continue;
    if (isInstrumentId(dest)) {
      hasObservedBalance(dest, observations) ||
        Fail`missing balance observation for ${q(dest)}`;
    }
  }

  while (schedule.pending()) {
    const ready = schedule.ready();

    const debits = new Map<PortfolioBalancePlaceRef, bigint>();
    const shareDebits = new Map<InstrumentId, bigint>();
    for (const ix of ready) {
      const movement = flow[ix];
      if (!movement || movement.kind === 'claimRewards') continue;
      const { src, debitValueUusd } = movement;
      debits.set(src, (debits.get(src) ?? 0n) + debitValueUusd);
      if (movement.kind === 'redeemShares') {
        shareDebits.set(
          movement.src,
          (shareDebits.get(movement.src) ?? 0n) + movement.shares,
        );
      }
    }
    for (const [src, debit] of shareDebits) {
      const available = remainingShares.get(src) ?? 0n;
      available >= debit ||
        Fail`unfunded share withdrawal from ${q(src)}: available ${q(available)} < requested ${q(debit)}`;
    }
    for (const [src, debit] of debits.entries()) {
      if (isInterChainAccountRef(src) && remainingCash.has(src)) {
        const available = remainingCash.get(src)!;
        available >= debit ||
          Fail`unfunded USDC movement from ${q(src)}: available ${q(available)} < requested ${q(debit)}`;
      }
      const balance = balances.get(src) ?? 0n;
      balance >= debit ||
        Fail`unfunded plan movement from ${q(src)}: balance ${q(balance)} < debit ${q(debit)}`;
    }

    for (const ix of ready) {
      const movement = flow[ix];
      if (!movement || movement.kind === 'claimRewards') continue;
      const { src, dest, amount, debitValueUusd } = movement;
      balances.set(src, (balances.get(src) ?? 0n) - debitValueUusd);
      balances.set(dest, (balances.get(dest) ?? 0n) + amount.value);
      if (isInterChainAccountRef(src) && remainingCash.has(src)) {
        remainingCash.set(src, remainingCash.get(src)! - amount.value);
      }
      if (isInterChainAccountRef(dest) && remainingCash.has(dest)) {
        remainingCash.set(dest, remainingCash.get(dest)! + amount.value);
      }
    }
    for (const [src, debit] of shareDebits) {
      remainingShares.set(src, remainingShares.get(src)! - debit);
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
 * target allocation ceiling and its initial balance. Only the final-balance
 * check allows a shared {@link MAX_CHAIN_ALLOCATION_DIVERGENCE_UUSDC} per chain. Partial-failure,
 * mandate, and position checks remain exact.
 *
 * @returns The decoded accounting operations for subsequent execution binding.
 */
export const vetPlanAllocation = (
  targetAllocation: TargetAllocation,
  plan: FundsFlowPlan,
  observations: PlanObservations,
  getUsdcAddress?: GetUsdcAddress,
): DecodedPlan => {
  const decodedPlan = decodePlan(plan, observations);
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
  const balances = projectPlanBalances(
    decodedPlan,
    observations,
    getUsdcAddress,
  );
  vetAllocationCeilings(balances, targetAllocation);
  vetPartialPlanAllocation(targetAllocation, decodedPlan, observations);
  return decodedPlan;
};
harden(vetPlanAllocation);

type VettedAllocationPlan = Readonly<{
  commitNow: boolean;
  shareWithdrawals?: ReturnType<typeof bindShareWithdrawals>;
}>;

/**
 * Vet a target allocation and optional execution plan against delegated
 * permissions and the attested observations of the portfolio.
 *
 * @returns The policy commit decision and execution instructions bound to the
 * plan that passed allocation checks. `commitNow: false` means observation-
 * dependent permissions require a later plan.
 * @throws {Error} if the allocation, plan, or observations violate the
 * delegated permissions, or if a plan lacks observations
 */
export const vetAllocationPlan = (
  permissions: PortfolioPermissions,
  targetAllocation: TargetAllocation,
  plan: FundsFlowPlan | undefined,
  observations: PlanObservations | undefined,
  addresses: {
    getUsdcAddress?: GetUsdcAddress;
    getVaultAddress?: GetVaultAddress;
  } = {},
): VettedAllocationPlan => {
  assertMandateForAllocation(permissions, targetAllocation);
  if (!plan) return harden({ commitNow: !needsObservations(permissions) });

  if (!observations) throw Fail`allocation plan requires observations`;
  const decodedPlan = vetPlanAllocation(
    targetAllocation,
    plan,
    observations,
    addresses.getUsdcAddress,
  );
  assertMandateForPlanObservations(permissions, targetAllocation, observations);
  const shareWithdrawals = bindShareWithdrawals(
    decodedPlan,
    addresses.getVaultAddress,
  );
  return harden({
    commitNow: true,
    ...(keys(shareWithdrawals).length && { shareWithdrawals }),
  });
};
harden(vetAllocationPlan);
