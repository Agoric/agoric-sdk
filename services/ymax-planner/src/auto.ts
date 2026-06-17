import type { AssetPlaceRef } from '@aglocal/portfolio-contract/src/type-guards-steps.js';
import type { TargetAllocation } from '@aglocal/portfolio-contract/src/type-guards.js';
import type { Brand, NatAmount } from '@agoric/ertp/src/types.js';
import { typedEntries } from '@agoric/internal';
import { computeTargetBalances } from '@agoric/portfolio-api/src/target-balances.js';
import type { ComputeTargetBalancesOptions } from '@agoric/portfolio-api/src/target-balances.js';
import { isInstrumentId } from '@agoric/portfolio-api/src/places.js';
import type { PortfolioKey } from '@agoric/portfolio-api';
import type { PortfolioBalanceReader } from './yds-portfolio-balances.ts';
import { YDS_PORTFOLIO_BALANCE_CACHE_TTL_MS } from './yds-portfolio-balances.ts';

export type AutoRebalanceCriteriaOptions = {
  /** Absolute allocation drift threshold in basis points. */
  driftBps: bigint;
  /** Minimum target-balance deposits to instruments required for drift. */
  driftMinDeposit: bigint;
  /** Minimum target-balance deposits to instruments required for cash. */
  cashMinDeposit: bigint;
};

export type AutoRebalanceCriteria = {
  shouldRebalance: boolean;
  positionDrift: boolean;
  excessCash: boolean;
  instrumentDeposits: bigint;
};

export type AutoRebalanceBalanceCache = Map<
  PortfolioKey,
  {
    expiresAt: number;
    balances: Partial<Record<AssetPlaceRef, NatAmount>>;
  }
>;

export type RebalanceTargetContext<
  C extends AssetPlaceRef,
  T extends string & keyof TargetAllocation,
> = Pick<
  ComputeTargetBalancesOptions<C, T>,
  | 'brand'
  | 'currentBalances'
  | 'targetAllocation'
  | 'network'
  | 'instrumentBlocks'
>;

const abs = (value: bigint) => (value < 0n ? -value : value);

const sumAmounts = (
  amounts: Partial<Record<AssetPlaceRef, NatAmount | undefined>>,
): bigint =>
  Object.values<NatAmount | undefined>(amounts).reduce(
    (acc, amount) => acc + (amount?.value ?? 0n),
    0n,
  );

const sumWeights = (targetAllocation: TargetAllocation): bigint =>
  Object.values(targetAllocation).reduce<bigint>(
    (acc, weight) => acc + (weight ?? 0n),
    0n,
  );

const hasAllocationDrift = (
  currentBalances: Partial<Record<AssetPlaceRef, NatAmount | undefined>>,
  targetAllocation: TargetAllocation | undefined,
  driftBps: bigint,
): boolean => {
  if (!targetAllocation) return false;
  const currentTotal = sumAmounts(currentBalances);
  const targetWeightTotal = sumWeights(targetAllocation);
  if (currentTotal <= 0n || targetWeightTotal <= 0n) return false;

  const instrumentKeys = new Set(
    [...Object.keys(currentBalances), ...Object.keys(targetAllocation)].filter(
      isInstrumentId,
    ),
  );
  const denominator = currentTotal * targetWeightTotal;
  return [...instrumentKeys].some(instrument => {
    const currentValue = currentBalances[instrument]?.value ?? 0n;
    const targetWeight = targetAllocation[instrument] ?? 0n;
    const numerator = abs(
      currentValue * targetWeightTotal - targetWeight * currentTotal,
    );
    return numerator * 10_000n > driftBps * denominator;
  });
};

const hasExcessCash = (
  currentBalances: Partial<Record<AssetPlaceRef, NatAmount | undefined>>,
  targetAllocation: TargetAllocation | undefined,
): boolean => {
  if (!targetAllocation) return false;
  const currentTotal = sumAmounts(currentBalances);
  const targetWeightTotal = sumWeights(targetAllocation);
  if (currentTotal <= 0n || targetWeightTotal <= 0n) return false;

  return typedEntries(currentBalances).some(([place, amount]) => {
    if (!place.startsWith('@')) return false;
    const currentValue = amount?.value ?? 0n;
    const targetWeight = targetAllocation[place] ?? 0n;
    return currentValue * targetWeightTotal > targetWeight * currentTotal;
  });
};

export const computeRebalanceTargets = <
  C extends AssetPlaceRef,
  T extends string & keyof TargetAllocation,
>(
  details: RebalanceTargetContext<C, T>,
) => {
  const { brand, currentBalances, network, targetAllocation } = details;
  if (!targetAllocation) return {};
  return computeTargetBalances({
    brand,
    currentBalances,
    network,
    targetAllocation,
    instrumentBlocks: details.instrumentBlocks,
  });
};

const getTargetInstrumentDeposits = (
  currentBalances: Partial<Record<AssetPlaceRef, NatAmount | undefined>>,
  targetAllocation: TargetAllocation | undefined,
  targetBalances: Partial<Record<AssetPlaceRef, NatAmount>>,
): bigint => {
  if (!targetAllocation) return 0n;
  return typedEntries(targetBalances).reduce((total, [place, target]) => {
    if (
      !target ||
      !isInstrumentId(place) ||
      (targetAllocation[place] ?? 0n) <= 0n
    ) {
      return total;
    }
    const delta = target.value - (currentBalances[place]?.value ?? 0n);
    return delta > 0n ? total + delta : total;
  }, 0n);
};

export const assessAutoRebalanceCriteria = (
  currentBalances: Partial<Record<AssetPlaceRef, NatAmount | undefined>>,
  targetAllocation: TargetAllocation | undefined,
  targetBalances: Partial<Record<AssetPlaceRef, NatAmount>>,
  options: AutoRebalanceCriteriaOptions,
): AutoRebalanceCriteria => {
  const { driftBps, driftMinDeposit, cashMinDeposit } = options;
  const instrumentDeposits = getTargetInstrumentDeposits(
    currentBalances,
    targetAllocation,
    targetBalances,
  );
  const positionDrift = hasAllocationDrift(
    currentBalances,
    targetAllocation,
    driftBps,
  );
  const excessCash = hasExcessCash(currentBalances, targetAllocation);
  const driftFired = positionDrift && instrumentDeposits >= driftMinDeposit;
  const cashFired = excessCash && instrumentDeposits >= cashMinDeposit;

  return harden({
    shouldRebalance: driftFired || cashFired,
    positionDrift,
    excessCash,
    instrumentDeposits,
  });
};

export const makeCachedPortfolioBalanceGetter = ({
  balanceCache,
  brand,
  console,
  getFreshBalances,
  getYdsPortfolioBalances,
  now,
}: {
  balanceCache: AutoRebalanceBalanceCache;
  brand: Brand<'nat'>;
  console: Pick<Console, 'warn'>;
  getFreshBalances: (
    portfolioKey: PortfolioKey,
  ) => Promise<Partial<Record<AssetPlaceRef, NatAmount>>>;
  getYdsPortfolioBalances?: PortfolioBalanceReader;
  now: () => number;
}) => {
  return async (portfolioKey: PortfolioKey) => {
    const cached = balanceCache.get(portfolioKey);
    if (cached && cached.expiresAt > now()) return cached.balances;
    try {
      const balances =
        getYdsPortfolioBalances &&
        (await getYdsPortfolioBalances(portfolioKey, brand));
      if (balances) {
        balanceCache.set(portfolioKey, {
          expiresAt: now() + YDS_PORTFOLIO_BALANCE_CACHE_TTL_MS,
          balances,
        });
        return balances;
      }
    } catch (err) {
      console.warn(
        `[${portfolioKey}.autoRebalance] ⚠️ YDS balance query failed; using direct balances`,
        err,
      );
    }
    const balances = await getFreshBalances(portfolioKey);
    balanceCache.set(portfolioKey, {
      expiresAt: now() + YDS_PORTFOLIO_BALANCE_CACHE_TTL_MS,
      balances,
    });
    return balances;
  };
};
