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
  matchHoldingTokenId,
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
import { getPrincipalWithdrawalProtocol } from './principal-withdrawal.ts';
import {
  bindRewardClaim,
  bindRewardSwap,
  vetRewardSwapBudgets,
  type ClaimBoundStep,
  type GetEvmContracts,
  type RewardBoundStep,
  type SwapBoundStep,
} from './reward-bindings.ts';
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

const incrementBy = <K>(map: Map<K, bigint>, key: K, delta: bigint) =>
  map.set(key, (map.get(key) ?? 0n) + delta);

/** Sum bigints, treating omitted values as zero. */
const sumOptionalBigints = (bigints: Array<bigint | undefined>): bigint =>
  bigints.reduce<bigint>((sum, value = 0n) => sum + value, 0n);

/** Sum allocation portions, treating omitted portions as zero. */
const sumPortions = (targetAllocation: TargetAllocation): bigint =>
  sumOptionalBigints(values(targetAllocation));

/**
 * Sum observed values by portfolio location, in micro-USD.
 * These values measure exposure; they do not establish spendable quantities.
 * Rewards are excluded until their value can be accounted for. This also
 * excludes rewards from the portfolio total used by maxVaultShareBps.
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
  for (const { place, kind, valueUusd, balanceUsdc } of holdings) {
    if (balanceUsdc !== undefined) {
      legacyBalances.set(
        place,
        (legacyBalances.get(place) ?? 0n) + balanceUsdc,
      );
    }
    if (kind === 'claimable-reward' || kind === 'claimed-reward') continue;
    if (valueUusd === undefined) {
      throw Fail`missing holding valuation for ${q(place)}`;
    }
    result.set(place, (result.get(place) ?? 0n) + valueUusd);
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
 *
 * @param addedValueUusd value the plan adds to the observed portfolio, such
 *   as the enforced minimum outputs of its reward swaps, which its movements
 *   may invest
 */
export const assertMandateForPlanObservations = (
  permissions: PortfolioPermissions,
  targetAllocation: TargetAllocation,
  observations: PlanObservations,
  addedValueUusd = 0n,
): void => {
  const allocation = permissions.allocation;
  if (typeof allocation !== 'object') return;
  const { minVaultTvlUsd, maxVaultShareBps } = allocation;
  if (minVaultTvlUsd === undefined && maxVaultShareBps === undefined) return;
  const totalPortions = sumPortions(targetAllocation);
  const portfolioValueUusd =
    maxVaultShareBps === undefined
      ? 0n
      : sumOptionalBigints([...sumValueUusdByPlace(observations).values()]) +
        addedValueUusd;

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

/**
 * Closed operations for mandate analysis. Reward claims have no USDC amount,
 * while reward swaps produce at least their minimum USDC output.
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
  | ((
      | { kind: 'redeemShares'; src: ERC4626InstrumentId; shares: bigint }
      | { kind: 'withdrawMax'; src: InstrumentId }
    ) & {
      dest: InterChainAccountRef;
      /** Minimum destination quantity, not the quantity removed from src. */
      amount: MovementDesc['amount'];
      /** Micro-USD exposure removed from the source, independent of proceeds. */
      debitValueUusd: bigint;
      holding: TypedHoldingDetail & { valueUusd: bigint };
    })
  | {
      kind: 'claimRewards';
      src: PortfolioBalancePlaceRef;
      dest: InterChainAccountRef;
      bound: ClaimBoundStep;
    }
  | {
      kind: 'swap';
      src: InterChainAccountRef;
      dest: InterChainAccountRef;
      /** Enforced minimum USDC output, credited to `dest`. */
      amount: MovementDesc['amount'];
      /** Rewards carry no valuation, so a swap debits no exposure. */
      debitValueUusd: 0n;
      bound: SwapBoundStep;
    };

type DecodedPlan = Omit<FundsFlowPlan, 'flow'> & { flow: PlanOperation[] };

/** Resolve USDC identity from contract configuration, not from observations. */
type GetUsdcTokenId = (account: InterChainAccountRef) => string | undefined;

type GetProtocolAddress = (src: InstrumentId) => EvmAddress | undefined;

type GetVaultAddress = (src: ERC4626InstrumentId) => EvmAddress | undefined;

/** Narrow powers for binding checks; callbacks provide the configured details. */
export type BindingDetailAccess = {
  getUsdcTokenId?: GetUsdcTokenId;
  getProtocolAddress?: GetProtocolAddress;
  getVaultAddress?: GetVaultAddress;
  hasMinimumRedemptionContracts?: (src: InstrumentId) => boolean;
  /** Required to bind reward claims and swaps. */
  getEvmContracts?: GetEvmContracts;
  /** Current time, in seconds since the epoch, to check swap expiry. */
  now?: bigint;
};

/**
 * Decode once so every balance check uses the same operation semantics.
 * Legacy balance observations support exact-amount movements only.
 * Maximum withdrawals require typed share or principal observations.
 */
const decodePlan = (
  plan: FundsFlowPlan,
  observations: PlanObservations,
  access: Pick<BindingDetailAccess, 'getEvmContracts' | 'now'> = {},
): DecodedPlan => {
  const flow = plan.flow.map((movement): PlanOperation => {
    const { src, dest, amount, claimRewards, swap, withdraw } = movement;
    if (!isPortfolioBalancePlaceRef(src)) {
      throw Fail`allocation plan does not support deposit or withdrawal place ${q(src)}`;
    }
    if (!isPortfolioBalancePlaceRef(dest)) {
      throw Fail`allocation plan does not support deposit or withdrawal place ${q(dest)}`;
    }
    if (claimRewards || swap) {
      !claimRewards ||
        !swap ||
        Fail`a step cannot both claim and swap rewards at ${q(src)}`;
      !withdraw || Fail`a reward step cannot withdraw at ${q(src)}`;
      const { getEvmContracts, now } = access;
      if (!getEvmContracts || now === undefined) {
        throw Fail`reward claims and swaps are not supported here`;
      }
      if (claimRewards) {
        const bound = bindRewardClaim(
          movement,
          claimRewards,
          observations,
          getEvmContracts,
        );
        return { kind: 'claimRewards', src, dest: bound.account, bound };
      }
      const bound = bindRewardSwap(
        movement,
        swap!,
        observations,
        getEvmContracts,
        now,
      );
      return {
        kind: 'swap',
        src: bound.account,
        dest: bound.account,
        amount,
        debitValueUusd: 0n,
        bound,
      };
    }
    src !== dest ||
      Fail`allocation plan does not support self-movement at ${q(src)}`;
    // The mandate checks below apply to the instrument named in the plan.
    // Execution would use the instrument on the account's chain, so the two
    // chains must match for those checks to cover what actually happens.
    vetInstrumentAccountChain(movement);
    if (withdraw?.max === true || withdraw?.amountOfShares !== undefined) {
      const destIsChainAccount =
        isInterChainAccountRef(dest) && dest === `@${chainOf(src)}`;
      if (isERC4626MorphoInstrumentId(src)) {
        if (!destIsChainAccount) {
          throw Fail`share redemption requires a Morpho source and its chain account destination: ${q(src)} -> ${q(dest)}`;
        }
        const candidates = (observations.holdings || []).filter(
          holding => holding.place === src && holding.kind === 'shares',
        );
        candidates.length === 1 ||
          Fail`share redemption requires one observed share holding at ${q(src)}; found ${q(candidates.length)}`;
        const holding = candidates[0]!;
        const { valueUusd } = holding;
        if (valueUusd === undefined) {
          throw Fail`missing holding valuation for ${q(src)}`;
        }
        const shares = withdraw?.amountOfShares ?? holding.amount;
        shares <= holding.amount ||
          Fail`requested shares ${q(shares)} exceed observed shares ${q(holding.amount)} at ${q(src)}`;
        amount.value === 0n ||
          shares > 0n ||
          Fail`empty share holding cannot meet proceeds minimum ${q(amount.value)} at ${q(src)}`;
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
      if (
        !isInstrumentId(src) ||
        !getPrincipalWithdrawalProtocol(src) ||
        !destIsChainAccount
      ) {
        throw Fail`maximum withdrawal requires a compatible source and its chain account destination: ${q(src)} -> ${q(dest)}`;
      }
      withdraw?.amountOfShares === undefined ||
        Fail`principal withdrawal does not support amountOfShares at ${q(src)}`;
      const candidates = (observations.holdings || []).filter(
        holding => holding.place === src && holding.kind === 'principal',
      );
      candidates.length === 1 ||
        Fail`maximum withdrawal requires one observed principal holding at ${q(src)}; found ${q(candidates.length)}`;
      const holding = candidates[0]!;
      if (holding.valueUusd !== holding.amount) {
        throw Fail`principal withdrawal requires one-for-one USDC valuation at ${q(src)}`;
      }
      amount.value === 0n ||
        holding.amount > 0n ||
        Fail`empty principal holding cannot meet proceeds minimum ${q(amount.value)} at ${q(src)}`;
      return {
        kind: 'withdrawMax',
        src,
        dest,
        amount,
        debitValueUusd: holding.valueUusd,
        holding: holding as typeof holding & {
          valueUusd: (typeof holding)['amount'];
        },
      };
    }
    // Exact withdrawals from shares still treat micro-USDC as micro-USD at
    // parity until observations include an underlying USDC quantity (AGO-1709).
    const principal =
      isInstrumentId(src) && getPrincipalWithdrawalProtocol(src)
        ? observations.holdings?.find(
            holding => holding.place === src && holding.kind === 'principal',
          )
        : undefined;
    let debitValueUusd = amount.value;
    if (principal) {
      const { valueUusd } = principal;
      if (valueUusd === undefined) {
        throw Fail`missing holding valuation for ${q(src)}`;
      }
      if (principal.amount === 0n) {
        valueUusd === 0n ||
          Fail`empty principal holding has nonzero valuation at ${q(src)}`;
        // Supplies after observation are credited at parity.
        debitValueUusd = amount.value;
      } else {
        // Round down so remaining USD exposure is not understated.
        debitValueUusd = (valueUusd * amount.value) / principal.amount;
      }
    }
    return {
      kind: 'move',
      src,
      dest,
      amount,
      debitValueUusd,
    };
  });
  vetRewardSwapBudgets(
    flow.map(op =>
      op.kind === 'claimRewards' || op.kind === 'swap' ? op.bound : undefined,
    ),
    plan.order,
    observations,
  );
  const exactSources = new Set(
    flow
      .filter(({ kind, src }) => kind === 'move' && isInstrumentId(src))
      .map(({ src }) => src),
  );
  for (const { kind, src } of flow) {
    if (
      (kind === 'redeemShares' || kind === 'withdrawMax') &&
      exactSources.has(src)
    ) {
      throw Fail`cannot mix exact-amount and max/share withdrawals at ${q(src)}`;
    }
  }
  return harden({
    flow,
    ...(plan.order !== undefined && { order: plan.order }),
  });
};

export type BoundStep =
  | Readonly<
      | {
          kind: 'redeemShares';
          src: ERC4626InstrumentId;
          vaultAddress: EvmAddress;
          shares: bigint;
          minimumProceeds?: bigint;
        }
      | {
          kind: 'withdrawMax';
          src: InstrumentId;
          protocolAddress: EvmAddress;
          tokenAddress: EvmAddress;
          /** Observed underlying quantity; zero skips an already empty position. */
          amount: bigint;
          minimumProceeds?: bigint;
        }
    >
  | RewardBoundStep;

const MAX_MINIMUM_BEARING_SHARES = 10n ** 27n;

/** Derive execution instructions from the same operations used by allocation checks. */
const bindSteps = (
  steps: readonly PlanOperation[],
  addresses: BindingDetailAccess,
): Partial<Record<number, BoundStep>> => {
  const {
    getVaultAddress,
    hasMinimumRedemptionContracts,
    getProtocolAddress,
    getUsdcTokenId,
  } = addresses;
  const bound: Partial<Record<number, BoundStep>> = {};
  for (const [step, movement] of steps.entries()) {
    switch (movement.kind) {
      case 'redeemShares': {
        const vaultAddress = getVaultAddress?.(movement.src);
        if (!vaultAddress) {
          throw Fail`no configured vault for ${q(movement.src)}`;
        }
        matchHoldingTokenId(movement.holding, vaultAddress) ||
          Fail`observed share token ${q(movement.holding.tokenId)} does not match configured vault ${q(vaultAddress)} at ${q(movement.src)}`;
        const minimumProceeds = movement.amount.value;
        if (minimumProceeds > 0n) {
          hasMinimumRedemptionContracts?.(movement.src) ||
            Fail`Morpho minimum redemption contracts not configured for ${q(movement.src)}`;
          (movement.shares > 0n &&
            movement.shares <= MAX_MINIMUM_BEARING_SHARES) ||
            Fail`shares ${q(movement.shares)} exceed the range for enforcing a minimum at ${q(movement.src)}`;
        }
        bound[step] = {
          kind: 'redeemShares',
          src: movement.src,
          vaultAddress,
          shares: movement.shares,
          ...(minimumProceeds > 0n && { minimumProceeds }),
        };
        break;
      }
      case 'withdrawMax': {
        const { src, dest, holding } = movement;
        holding.kind === 'principal' ||
          Fail`internal: maximum withdrawal requires principal`;
        const protocolAddress = getProtocolAddress?.(src);
        const tokenAddress = getUsdcTokenId?.(dest) as EvmAddress | undefined;
        if (!protocolAddress || !tokenAddress) {
          throw Fail`no configured protocol or USDC for ${q(src)}`;
        }
        matchHoldingTokenId(holding, tokenAddress) ||
          Fail`observed principal token does not match configured USDC at ${q(src)}`;
        const minimumProceeds = movement.amount.value;
        if (minimumProceeds > 0n) {
          hasMinimumRedemptionContracts?.(src) ||
            Fail`principal minimum withdrawal contracts not configured for ${q(src)}`;
        }
        bound[step] = {
          kind: 'withdrawMax',
          src,
          protocolAddress,
          tokenAddress,
          amount: holding.amount,
          ...(minimumProceeds > 0n && { minimumProceeds }),
        };
        break;
      }
      case 'claimRewards':
      case 'swap':
        // Bound from signed evidence when decoded.
        bound[step] = movement.bound;
        break;
      default: // no-op
    }
  }
  return harden(bound);
};
harden(bindSteps);

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
      .filter(
        ({ amount, valueUusd }) =>
          amount !== 0n || (valueUusd !== undefined && valueUusd !== 0n),
      )
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
 * A reward swap adds its enforced minimum output to the portfolio total, which
 * excludes reward holdings, but only in outcomes where it completed. So the
 * ceiling of a position with target portion `c` of `P` must hold for every
 * dependency-closed set `S` of completed steps:
 * `P * (initial + delta(S)) <= c * (total + swapCredit(S))`, that is,
 * `P * initial + max_S(P * delta(S) - c * swapCredit(S)) <= c * total`.
 * This is conservative for a position initially above its target: the
 * initial-balance exception applies to outcomes that don't increase it, but
 * they still count in the maximum, so swap proceeds cannot raise its ceiling
 * enough to let it grow. Excluding them exactly would need a constrained
 * closure. TODO(AGO-1778): lift this limitation.
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

  const dependenciesOf = (index: number) => [
    ...(dependencies.get(index) ?? []),
  ];
  const deltaAt = (place: InstrumentId, index: number) => {
    const movement = flow[index]!;
    if (movement.kind === 'claimRewards' || movement.kind === 'swap') {
      return 0n;
    }
    const { src, dest, amount } = movement;
    if (dest === place) return amount.value;
    if (src === place) return -movement.debitValueUusd;
    return 0n;
  };
  const hasSwaps = flow.some(({ kind }) => kind === 'swap');
  const swapCreditAt = (index: number) => {
    const movement = flow[index]!;
    return movement.kind === 'swap' ? movement.amount.value : 0n;
  };

  for (const place of instruments) {
    const initialBalance = initialBalances.get(place) ?? 0n;
    const maxDelta = maxWeightClosure(
      steps,
      index => deltaAt(place, index),
      dependenciesOf,
    );
    if (maxDelta <= 0n) continue;
    const ceiling = targetAllocation[place] ?? 0n;
    const maxExcess =
      totalPortions === 0n
        ? undefined
        : !hasSwaps
          ? totalPortions * maxDelta
          : maxWeightClosure(
              steps,
              index =>
                totalPortions * deltaAt(place, index) -
                ceiling * swapCreditAt(index),
              dependenciesOf,
            );
    const withinTarget =
      maxExcess !== undefined &&
      totalPortions * initialBalance + maxExcess <= totalBalance * ceiling;
    withinTarget ||
      Fail`plan intermediate balance exceeds target allocation at ${q(place)}: initial balance ${q(initialBalance)}, peak balance ${q(initialBalance + maxDelta)} of total ${q(totalBalance)} vs target portion ${q(ceiling)} of ${q(totalPortions)}`;
  }
};

/**
 * Simulate dependency-ordered execution to calculate final balances.
 *
 * Reward claims do not change the projected balances: they guarantee no
 * proceeds. A reward swap credits its account with its enforced minimum USDC
 * output, which later movements may then spend.
 *
 * @throws {Error} if a destination position lacks an observed starting balance
 * @throws {Error} if a concurrently ready group lacks sufficient funds
 */
const projectPlanBalances = (
  plan: DecodedPlan,
  observations: PlanObservations,
  getUsdcTokenId?: GetUsdcTokenId,
): Map<string, bigint> => {
  const balances = sumValueUusdByPlace(observations);
  const remainingCash = new Map<InterChainAccountRef, bigint>();
  if (observations.holdings?.length) {
    for (const movement of plan.flow) {
      if (movement.kind !== 'move') continue;
      const { src } = movement;
      if (isInstrumentId(src)) continue;
      if (remainingCash.has(src)) continue;
      const usdcTokenId = getUsdcTokenId?.(src);
      if (!usdcTokenId) throw Fail`no configured USDC token at ${q(src)}`;
      const candidates = observations.holdings.filter(
        holding =>
          holding.place === src &&
          holding.kind === 'token' &&
          matchHoldingTokenId(holding, usdcTokenId),
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
  const remainingPrincipal = new Map<InstrumentId, bigint>();
  for (const movement of flow) {
    if (movement.kind === 'redeemShares') {
      remainingShares.set(movement.src, movement.holding.amount);
    } else if (movement.kind === 'withdrawMax') {
      remainingPrincipal.set(movement.src, movement.holding.amount);
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
    const principalDebits = new Map<InstrumentId, bigint>();
    for (const ix of ready) {
      const movement = flow[ix];
      if (!movement || movement.kind === 'claimRewards') continue;
      incrementBy(debits, movement.src, movement.debitValueUusd);
      if (movement.kind === 'redeemShares') {
        incrementBy(shareDebits, movement.src, movement.shares);
      } else if (movement.kind === 'withdrawMax') {
        incrementBy(principalDebits, movement.src, movement.holding.amount);
      }
    }
    for (const [src, debit] of shareDebits) {
      const available = remainingShares.get(src) ?? 0n;
      available >= debit ||
        Fail`unfunded share withdrawal from ${q(src)}: available ${q(available)} < requested ${q(debit)}`;
    }
    for (const [src, debit] of principalDebits) {
      const available = remainingPrincipal.get(src) ?? 0n;
      available >= debit ||
        Fail`unfunded principal withdrawal from ${q(src)}: available ${q(available)} < requested ${q(debit)}`;
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
      if (movement.kind === 'swap') {
        // Only the enforced minimum output is guaranteed to arrive.
        const { dest, amount } = movement;
        incrementBy(balances, dest, amount.value);
        if (remainingCash.has(dest)) {
          incrementBy(remainingCash, dest, amount.value);
        }
        continue;
      }
      const { src, dest, amount, debitValueUusd } = movement;
      incrementBy(balances, src, -debitValueUusd);
      incrementBy(balances, dest, amount.value);
      if (isInterChainAccountRef(src) && remainingCash.has(src)) {
        incrementBy(remainingCash, src, -amount.value);
      }
      if (isInterChainAccountRef(dest) && remainingCash.has(dest)) {
        incrementBy(remainingCash, dest, amount.value);
      }
    }
    for (const [src, debit] of shareDebits) {
      incrementBy(remainingShares, src, -debit);
    }
    for (const [src, debit] of principalDebits) {
      incrementBy(remainingPrincipal, src, -debit);
    }
    for (const ix of ready) {
      schedule.complete(ix);
    }
  }

  return balances;
};

/**
 * Reject plans that add positions, finish above target ceilings, spend
 * unfunded reward swaps, or whose partial failure could increase a position
 * balance above both its
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
  getUsdcTokenId?: GetUsdcTokenId,
  rewardAccess: Pick<BindingDetailAccess, 'getEvmContracts' | 'now'> = {},
): DecodedPlan => {
  const decodedPlan = decodePlan(plan, observations, rewardAccess);
  // TODO(AGO-1303): Enforce on-chain fee limits, including repeated submissions:
  // https://linear.app/agoric/issue/AGO-1303/on-chain-fee-rate-limit
  // Agent-selected fees spend from the shared contract account. Fee protection
  // is deferred during controlled ymax0 testing; enforce it before opening
  // plan submission to untrusted agents.
  vetNoNewPositions(targetAllocation, plan);
  const balances = projectPlanBalances(
    decodedPlan,
    observations,
    getUsdcTokenId,
  );
  vetAllocationCeilings(balances, targetAllocation);
  vetPartialPlanAllocation(targetAllocation, decodedPlan, observations);
  return decodedPlan;
};
harden(vetPlanAllocation);

type VettedAllocationPlan = Readonly<{
  commitNow: boolean;
  boundSteps?: ReturnType<typeof bindSteps>;
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
  addresses: BindingDetailAccess = {},
): VettedAllocationPlan => {
  assertMandateForAllocation(permissions, targetAllocation);
  if (!plan) return harden({ commitNow: !needsObservations(permissions) });

  if (!observations) throw Fail`allocation plan requires observations`;
  const decodedPlan = vetPlanAllocation(
    targetAllocation,
    plan,
    observations,
    addresses.getUsdcTokenId,
    addresses,
  );
  // Reward holdings are not part of the observed value, but swapping them
  // adds at least the swaps' minimum outputs.
  const swapProceeds = sumOptionalBigints(
    decodedPlan.flow.map(op => (op.kind === 'swap' ? op.amount.value : 0n)),
  );
  assertMandateForPlanObservations(
    permissions,
    targetAllocation,
    observations,
    swapProceeds,
  );
  const boundSteps = bindSteps(decodedPlan.flow, addresses);
  return harden({
    commitNow: true,
    ...(keys(boundSteps).length && { boundSteps }),
  });
};
harden(vetAllocationPlan);

/** Whether a plan claims or swaps rewards. */
export const hasRewardSteps = (plan: FundsFlowPlan): boolean =>
  plan.flow.some(({ claimRewards, swap }) => !!claimRewards || !!swap);
harden(hasRewardSteps);

/**
 * Vet a plan that may only claim rewards and swap them, against the attested
 * observations of the portfolio. Such a plan moves no principal, so it
 * involves no target allocation.
 *
 * @returns execution instructions bound to the plan
 * @throws {Error} if a step does anything else, or does not match the
 *   evidence it selects, or if a swap is not funded
 */
export const vetRewardPlan = (
  plan: FundsFlowPlan,
  observations: PlanObservations,
  access: Required<Pick<BindingDetailAccess, 'getEvmContracts' | 'now'>>,
): NonNullable<VettedAllocationPlan['boundSteps']> => {
  plan.flow.length > 0 || Fail`a reward plan must have steps`;
  for (const [step, { claimRewards, swap }] of plan.flow.entries()) {
    claimRewards ||
      swap ||
      Fail`a reward plan may only claim and swap rewards, not step ${q(step)}`;
  }
  const decodedPlan = decodePlan(plan, observations, access);
  return bindSteps(decodedPlan.flow, access);
};
harden(vetRewardPlan);
