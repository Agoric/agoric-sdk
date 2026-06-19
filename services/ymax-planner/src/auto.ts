import type { AssetPlaceRef } from '@aglocal/portfolio-contract/src/type-guards-steps.js';
import {
  portfolioIdFromKey,
  type StatusFor,
  type TargetAllocation,
} from '@aglocal/portfolio-contract/src/type-guards.js';
import { NoSolutionError } from '@aglocal/portfolio-contract/tools/plan-solve.ts';
import type { GasEstimator } from '@aglocal/portfolio-contract/tools/plan-solve.ts';
import type { Brand, NatAmount, NatValue } from '@agoric/ertp';
import type { NetworkSpec } from '@agoric/portfolio-api/src/network/network-spec.js';
import {
  computeTargetBalances,
  TargetBalanceError,
} from '@agoric/portfolio-api/src/target-balances.js';
import { isInterChainAccountRef } from '@agoric/portfolio-api/src/type-guards.js';
import type { FundsFlowPlan, PortfolioKey } from '@agoric/portfolio-api';
import { annotateError } from '@endo/errors';
import { inspect } from 'node:util';
import type { InstrumentBlocks } from './instrument-status.ts';
import { UserInputError } from './support.ts';
import { getOwn } from './utils.js';

const { keys } = Object;

export type AutoRebalanceConfig = {
  /** Absolute allocation drift threshold in basis points. */
  driftBps: bigint;
  /** Minimum target-balance increase to instruments required for drift. */
  driftMinMoveUusdc: bigint;
  /** Minimum target-balance increase to instruments required for cash. */
  cashMinMoveUusdc: bigint;
};

export type AutoRebalanceDetail =
  | { reason: 'EXCESS_CASH'; excessCashAllocated: NatValue }
  | {
      reason: 'POSITION_DRIFT';
      totalMoved: NatValue;
      greatestBpsDrift: number;
    };

export type RebalanceSummary = {
  currentBalances: Partial<Record<AssetPlaceRef, NatAmount | undefined>>;
  targetAllocation: TargetAllocation;
  totalBalance: NatValue;
  totalWeight: bigint;
  increases: [AssetPlaceRef, bigint][];
};

const computeExcessCashAllocated = (summary: RebalanceSummary): NatValue =>
  summary.increases.reduce<bigint>(
    (acc, [place, increase]) =>
      acc + (isInterChainAccountRef(place) && increase < 0n ? -increase : 0n),
    0n,
  );

/**
 * Compute the fraction of a portfolio's total balance at a particular position
 * in basis points, and return the absolute value of the difference between that
 * result and its target allocation in basis points.
 */
const computeBpsDrift = (
  place: AssetPlaceRef,
  summary: RebalanceSummary,
): number => {
  const currentValue = getOwn(summary.currentBalances, place)?.value ?? 0n;
  const targetWeight = getOwn(summary.targetAllocation, place) ?? 0n;
  // We tolerate rounding errors in these calculations.
  const totalBalance = Number(summary.totalBalance);
  const totalWeight = Number(summary.totalWeight);
  const actualBps = Number(currentValue * 10_000n) / totalBalance;
  const targetBps = Number(targetWeight * 10_000n) / totalWeight;
  const bpsDrift = actualBps - targetBps;
  return Math.abs(bpsDrift);
};

export const checkAutoRebalance = (
  targetAllocation: TargetAllocation,
  currentBalances: Partial<Record<AssetPlaceRef, NatAmount | undefined>>,
  targetBalances: Partial<Record<AssetPlaceRef, NatAmount>>,
  config: AutoRebalanceConfig,
): null | AutoRebalanceDetail => {
  const totalBalance = Object.values<NatAmount | undefined>(
    currentBalances,
  ).reduce<NatValue>((acc, amount) => acc + (amount?.value ?? 0n), 0n);
  const totalWeight = Object.values(targetAllocation).reduce<bigint>(
    (acc, weight) => acc + weight,
    0n,
  );
  const targetPlaces = keys(targetAllocation) as AssetPlaceRef[];
  const places = [
    ...new Set([...keys(currentBalances), ...targetPlaces]),
  ] as AssetPlaceRef[];
  const increases = places.map(place => {
    const current = getOwn(currentBalances, place)?.value ?? 0n;
    const target = getOwn(targetBalances, place)?.value ?? 0n;
    return [place, target - current] as [AssetPlaceRef, bigint];
  });
  const rebalanceSummary: RebalanceSummary = {
    currentBalances,
    targetAllocation,
    totalBalance,
    totalWeight,
    increases,
  };

  const excessCashAllocated = computeExcessCashAllocated(rebalanceSummary);
  if (excessCashAllocated >= config.cashMinMoveUusdc) {
    return { reason: 'EXCESS_CASH', excessCashAllocated };
  }

  const totalMoved = increases.reduce<bigint>(
    (acc, [_place, increase]) => acc + (increase > 0n ? increase : 0n),
    0n,
  );
  if (totalMoved >= config.driftMinMoveUusdc && targetPlaces.length > 0) {
    const bpsDrift = targetPlaces.map<[AssetPlaceRef, number]>(place => [
      place,
      computeBpsDrift(place, rebalanceSummary),
    ]);
    const [, greatestBpsDrift] = bpsDrift.sort((a, b) => b[1] - a[1])[0];
    if (greatestBpsDrift > Number(config.driftBps)) {
      return { reason: 'POSITION_DRIFT', totalMoved, greatestBpsDrift };
    }
  }

  return null;
};

export type MaybeAutoRebalancePowers = {
  autoRebalance: AutoRebalanceConfig;
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
  const { enabledAutoFeatures, targetAllocation } = portfolioStatus;
  if (!enabledAutoFeatures?.rebalance || !targetAllocation) return;

  const path = `${portfoliosPathPrefix}.${portfolioKey}`;
  const portfolioId = portfolioIdFromKey(portfolioKey);
  const logPrefix = `[${portfolioKey}.autoRebalance]`;
  const { policyVersion, rebalanceCount } = portfolioStatus;
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
    const shouldRebalance = checkAutoRebalance(
      targetAllocation,
      currentBalances,
      targetBalances,
      autoRebalance,
    );
    const plan = shouldRebalance
      ? await planRebalanceToAllocations(plannerContext)
      : undefined;
    if (!plan || plan.flow.length === 0) {
      const skipDetails: Record<string, unknown> = { targetBalances };
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
      inspectForStdout({ ...logContext, plan }),
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
