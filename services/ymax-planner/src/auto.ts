import type { AssetPlaceRef } from '@aglocal/portfolio-contract/src/type-guards-steps.js';
import {
  portfolioIdFromKey,
  type StatusFor,
  type TargetAllocation,
} from '@aglocal/portfolio-contract/src/type-guards.js';
import { NoSolutionError } from '@aglocal/portfolio-contract/tools/plan-solve.ts';
import type { GasEstimator } from '@aglocal/portfolio-contract/tools/plan-solve.ts';
import type { Brand, NatAmount } from '@agoric/ertp/src/types.js';
import { typedEntries } from '@agoric/internal';
import type { NetworkSpec } from '@agoric/portfolio-api/src/network/network-spec.js';
import {
  computeTargetBalances,
  TargetBalanceError,
} from '@agoric/portfolio-api/src/target-balances.js';
import type { ComputeTargetBalancesOptions } from '@agoric/portfolio-api/src/target-balances.js';
import { isInstrumentId } from '@agoric/portfolio-api/src/places.js';
import type { FundsFlowPlan, PortfolioKey } from '@agoric/portfolio-api';
import { annotateError } from '@endo/errors';
import { inspect } from 'node:util';
import type { InstrumentBlocks } from './instrument-status.ts';
import { UserInputError } from './support.ts';
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

const mapValueCompareAndSwap = <K, V>(
  map: Map<K, V>,
  key: K,
  oldValue: V | undefined,
  newValue: V,
): V | undefined => {
  const currentValue = map.get(key);
  if (currentValue !== oldValue) return currentValue;
  map.set(key, newValue);
  return newValue;
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
    await null;
    try {
      const balances =
        getYdsPortfolioBalances &&
        (await getYdsPortfolioBalances(portfolioKey, brand));
      if (balances) {
        const stored = mapValueCompareAndSwap(
          balanceCache,
          portfolioKey,
          cached,
          {
            expiresAt: now() + YDS_PORTFOLIO_BALANCE_CACHE_TTL_MS,
            balances,
          },
        );
        return stored?.balances ?? balances;
      }
    } catch (err) {
      console.warn(
        `[${portfolioKey}.autoRebalance] ⚠️ YDS balance query failed; using direct balances`,
        err,
      );
    }
    const balances = await getFreshBalances(portfolioKey);
    const stored = mapValueCompareAndSwap(balanceCache, portfolioKey, cached, {
      expiresAt: now() + YDS_PORTFOLIO_BALANCE_CACHE_TTL_MS,
      balances,
    });
    return stored?.balances ?? balances;
  };
};

export type MaybeAutoRebalancePowers = {
  autoRebalance: AutoRebalanceCriteriaOptions;
  console: Pick<Console, 'log' | 'warn'>;
  depositBrand: Brand<'nat'>;
  feeBrand: Brand<'nat'>;
  gasEstimator: GasEstimator;
  getWalletInvocationUpdate: (messageId: string | number) => Promise<unknown>;
  inspectForStdout: (obj: unknown) => string;
  instrumentBlocks?: InstrumentBlocks;
  isDryRun?: boolean;
  network: NetworkSpec;
  planRebalanceToAllocations: (details: {
    path: string;
    flowDetail: { type: 'rebalance' };
    currentBalances: Partial<Record<AssetPlaceRef, NatAmount>>;
    policyVersion: number;
    rebalanceCount: number;
    targetAllocation: StatusFor['portfolio']['targetAllocation'];
    network: NetworkSpec;
    instrumentBlocks?: InstrumentBlocks;
    brand: Brand<'nat'>;
    feeBrand: Brand<'nat'>;
    gasEstimator: GasEstimator;
  }) => Promise<FundsFlowPlan>;
  portfoliosPathPrefix: string;
  walletStore: {
    get(
      targetName: 'planner',
      opts: { sendOnly: true },
    ): {
      rebalance: (
        portfolioId: number,
        planOrSteps: FundsFlowPlan | FundsFlowPlan['flow'],
        policyVersion: number,
        rebalanceCount: number,
      ) => Promise<{ tx: unknown; id: string | number }>;
    };
  };
};

export const maybeAutoRebalance = async (
  portfolioStatus: StatusFor['portfolio'],
  portfolioKey: PortfolioKey,
  currentBalances: Partial<Record<AssetPlaceRef, NatAmount>>,
  {
    autoRebalance,
    console,
    depositBrand,
    feeBrand,
    gasEstimator,
    getWalletInvocationUpdate,
    inspectForStdout,
    instrumentBlocks,
    isDryRun,
    network,
    planRebalanceToAllocations,
    portfoliosPathPrefix,
    walletStore,
  }: MaybeAutoRebalancePowers,
) => {
  if (!portfolioStatus.enabledAutoFeatures?.rebalance) return;
  const path = `${portfoliosPathPrefix}.${portfolioKey}`;
  const portfolioId = portfolioIdFromKey(portfolioKey);
  const logPrefix = `[${portfolioKey}.autoRebalance]`;
  const { policyVersion, rebalanceCount, targetAllocation } = portfolioStatus;
  const versions = [policyVersion, rebalanceCount] as const;

  const logContext = {
    path,
    flowDetail: { type: 'rebalance' as const },
    currentBalances,
    policyVersion,
    rebalanceCount,
    targetAllocation,
  };
  const plannerContext = {
    ...logContext,
    network,
    instrumentBlocks,
    brand: depositBrand,
    feeBrand,
    gasEstimator,
  };

  await null;
  try {
    const targetBalances = computeRebalanceTargets(plannerContext);
    const criteria = assessAutoRebalanceCriteria(
      currentBalances,
      targetAllocation,
      targetBalances,
      autoRebalance,
    );
    if (!criteria.shouldRebalance) {
      console.log(
        logPrefix,
        'skip',
        inspectForStdout({ ...logContext, targetBalances, criteria }),
      );
      return;
    }
    const plan = await planRebalanceToAllocations(plannerContext);
    if (plan.flow.length === 0) {
      console.log(
        logPrefix,
        'skip',
        inspectForStdout({
          ...logContext,
          targetBalances,
          criteria,
          reason: 'empty plan',
        }),
      );
      return;
    }

    const planOrSteps = plan.order ? plan : plan.flow;
    const txOpts = { sendOnly: true } as const;
    const planReceiver = walletStore.get('planner', txOpts);
    const { tx, id } = await planReceiver.rebalance(
      portfolioId,
      planOrSteps,
      ...versions,
    );
    if (!isDryRun) {
      void getWalletInvocationUpdate(id as any).catch(err => {
        console.warn(logPrefix, '⚠️ Failure for rebalance', err);
      });
    }
    console.log(
      logPrefix,
      'rebalance',
      criteria,
      inspectForStdout({ ...logContext, plan, criteria }),
      tx,
    );
  } catch (err) {
    annotateError(err, inspect(logContext, { depth: 4 }));
    if (
      err instanceof UserInputError ||
      err instanceof NoSolutionError ||
      err instanceof TargetBalanceError
    ) {
      console.warn(logPrefix, '⚠️ Skipping auto rebalance', err.message);
      return;
    }
    throw err;
  }
};
