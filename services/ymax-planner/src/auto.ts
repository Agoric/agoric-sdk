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
import { isInstrumentId } from '@agoric/portfolio-api/src/places.js';
import type { FundsFlowPlan, PortfolioKey } from '@agoric/portfolio-api';
import { annotateError } from '@endo/errors';
import { inspect } from 'node:util';
import type { InstrumentBlocks } from './instrument-status.ts';
import { UserInputError } from './support.ts';

export type AutoRebalanceCriteriaOptions = {
  /** Absolute allocation drift threshold in basis points. */
  driftBps: bigint;
  /** Minimum target-balance increase to instruments required for drift. */
  driftMinMoveUusdc: bigint;
  /** Minimum target-balance increase to instruments required for cash. */
  cashMinMoveUusdc: bigint;
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
  const { driftBps, driftMinMoveUusdc, cashMinMoveUusdc } = options;
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
  const driftFired = positionDrift && instrumentDeposits >= driftMinMoveUusdc;
  const cashFired = excessCash && instrumentDeposits >= cashMinMoveUusdc;

  return harden({
    shouldRebalance: driftFired || cashFired,
    positionDrift,
    excessCash,
    instrumentDeposits,
  });
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
  if (!targetAllocation) return;
  const versions = [policyVersion, rebalanceCount] as const;

  const logContext = {
    path,
    flowDetail: { type: 'rebalance' as const },
    currentBalances,
    policyVersion,
    rebalanceCount,
    targetAllocation,
  };
  const rebalanceDetails = {
    brand: depositBrand,
    currentBalances,
    network,
    targetAllocation,
    instrumentBlocks,
  };
  const plannerContext = {
    ...logContext,
    ...rebalanceDetails,
    feeBrand,
    gasEstimator,
  };

  await null;
  try {
    const targetBalances = computeTargetBalances(rebalanceDetails);
    const criteria = assessAutoRebalanceCriteria(
      currentBalances,
      targetAllocation,
      targetBalances,
      autoRebalance,
    );
    const plan = criteria.shouldRebalance
      ? await planRebalanceToAllocations(plannerContext)
      : undefined;
    if (!plan || plan.flow.length === 0) {
      const skipDetails: Record<string, unknown> = { targetBalances, criteria };
      if (plan) skipDetails.reason = 'empty plan';
      console.log(
        logPrefix,
        'skip',
        inspectForStdout({ ...logContext, ...skipDetails }),
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
