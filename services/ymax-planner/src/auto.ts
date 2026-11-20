import type { KyInstance } from 'ky';

import type { PortfolioPlanner } from '@aglocal/portfolio-contract/src/planner.exo.ts';
import type { AssetPlaceRef } from '@aglocal/portfolio-contract/src/type-guards-steps.js';
import {
  portfolioIdFromKey,
  type StatusFor,
  type TargetAllocation,
} from '@aglocal/portfolio-contract/src/type-guards.js';
import { NoSolutionError } from '@aglocal/portfolio-contract/tools/plan-solve.ts';
import type { GasEstimator } from '@aglocal/portfolio-contract/tools/plan-solve.ts';
import type { reflectWalletStore } from '@agoric/client-utils';
import type { Brand, NatAmount, NatValue } from '@agoric/ertp';
import { naiveCompare, partialMap, provideLazyMap } from '@agoric/internal';
import type { AccountId, CaipChainId } from '@agoric/orchestration';
import { matchHoldingTokenId } from '@agoric/portfolio-api/src/places.js';
import type { NetworkSpec } from '@agoric/portfolio-api/src/network/network-spec.js';
import {
  computeTargetBalances,
  TargetBalanceError,
} from '@agoric/portfolio-api/src/target-balances.js';
import { isInterChainAccountRef } from '@agoric/portfolio-api/src/type-guards.js';
import type {
  FundsFlowPlan,
  PortfolioKey,
  SupportedChain,
} from '@agoric/portfolio-api';
import { annotateError, Fail } from '@endo/errors';
import { inspect } from 'node:util';
import type { InspectOptions } from 'node:util';
import {
  type ChainGasState,
  type GasStateWindowDuration,
  type GasStateWindowMetric,
} from './gas-estimation.ts';
import type {
  InstrumentBlocks,
  InstrumentLiquidity,
} from './instrument-status.ts';
import { WITHDRAWAL_LIQUIDITY_LIMIT_BPS } from './instrument-status.ts';
import { UserInputError } from './support.ts';
import { getOwn } from './utils.js';
import type {
  RewardTokenRate,
  YdsTokenBalance,
} from './yds-portfolio-balances.ts';

const { keys } = Object;

export type AutoClaimConfig = {
  /**
   * Gas cost is only considered favorable when less than or equal to the
   * specified factor for each member of an arbitrary collection of historical
   * metrics.
   */
  readonly maxGasCostSpike: [
    factor: number,
    GasStateWindowDuration,
    GasStateWindowMetric,
  ][];
  readonly maxSlippageBps: number;
  readonly minRewardPerGas: number;
};

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

const isGasAcceptable = (
  gasCost: ChainGasState | undefined,
  maxThresholds: AutoClaimConfig['maxGasCostSpike'],
): boolean => {
  if (!gasCost) return false;
  const currentUusdPerGasUnit = gasCost.current.sampleUusd;
  if (currentUusdPerGasUnit === null) return false;
  return maxThresholds.every(threshold => {
    const [factor, windowDuration, windowMetric] = threshold;
    const key = `${windowMetric}Uusd` as keyof ChainGasState['windows'][number];
    const metricValue = gasCost.windows.find(
      w => w.duration === windowDuration,
    )?.[key];
    if (typeof metricValue !== 'number') return false;
    const maxUusdPerGasUnit = factor * metricValue;
    return currentUusdPerGasUnit <= maxUusdPerGasUnit;
  });
};

type AutoClaimSource = YdsTokenBalance & {
  uusdcValue: bigint;
  usdcTokenId: string;
  evmChainId: string | undefined;
};
export const pickAutoClaimSources = (
  tokenBalances: YdsTokenBalance[],
  {
    exchangeRates,
    gasCosts,
    autoClaimConfig,
    usdcTokensByChain,
    GAS_UNITS_PER_CLAIM,
    GAS_UNITS_PER_SWAP,
  }: Pick<
    AutoPowers,
    | 'autoClaimConfig'
    | 'exchangeRates'
    | 'gasCosts'
    | 'gasEstimator'
    | 'usdcTokensByChain'
    | 'GAS_UNITS_PER_CLAIM'
    | 'GAS_UNITS_PER_SWAP'
  >,
  uusdcThreshold?: bigint,
  pickLimit = Infinity,
): null | AutoClaimSource[] => {
  if (!exchangeRates || !gasCosts) return null;
  const picks: Exclude<ReturnType<typeof pickAutoClaimSources>, null> = [];

  // Evaluate each reward token independently.
  const tokenLocations = Map.groupBy(
    tokenBalances,
    ({ caipChainId, tokenId }) => `${caipChainId}:${tokenId}` as AccountId,
  );
  const gasCostByChain = new Map<CaipChainId, number>();
  for (const [_caipTokenId, rewardBalances] of tokenLocations) {
    const { chainName, caipChainId, tokenId } = rewardBalances[0];

    // Require USDC exchangability.
    const usdcTokenId = getOwn(usdcTokensByChain, chainName);
    if (!usdcTokenId) continue;
    const [, evmChainId] = caipChainId.match(/^eip155:([1-9][0-9]*)$/) || [];
    const usdcFromTokenRates = exchangeRates.filter(
      rate =>
        `${rate.evmChainId}` === evmChainId &&
        matchHoldingTokenId(
          { place: `@${chainName}`, tokenId },
          rate.sourceToken,
        ) &&
        rate.targetDenom === 'USDC',
    );
    if (!usdcFromTokenRates.length) continue;
    const getUusdcValue = (rewardTokenCount: bigint): bigint => {
      if (!rewardTokenCount) return 0n;
      // Per https://ymax.app/docs , rates are sorted by descending amount. Take
      // the first one whose amount is not too big, falling back on the lowest
      // amount (which is presumably the worst rate).
      const exchangeRate =
        usdcFromTokenRates.find(
          rate => BigInt(rate.sourceAmount) <= rewardTokenCount,
        ) || usdcFromTokenRates.at(-1)!;
      return (
        (rewardTokenCount * BigInt(exchangeRate.targetAmount)) /
        BigInt(exchangeRate.sourceAmount)
      );
    };

    // Require chain-scoped gas favorability.
    const uusdPerGasUnit = provideLazyMap(gasCostByChain, caipChainId, () => {
      const gasCost = gasCosts.find(cost => cost.caip2Id === caipChainId);
      return isGasAcceptable(gasCost, autoClaimConfig.maxGasCostSpike)
        ? (gasCost!.current.sampleUusd ?? NaN)
        : NaN;
    });
    if (!(uusdPerGasUnit >= 0)) continue;

    // Pick any sources for which the slippage-adjusted USD value is equal to or
    // greater than the estimated gas cost multiplied by minRewardPerGas
    // $value * (1 - maxSlippage) >= $gasUnits * costPerGasUnit * minRewardPerGas
    //   => $value / $gasUnits >= costPerGasUnit * minRewardPerGas / (1 - maxSlippage)
    // Remember also that a swap (along with its gas cost) is always necessary
    // but covers any number of claims, so individually-justified claims that
    // can't cover the additional gas for swapping on their own can still be
    // picked as part of a batch (once we're swapping, we include every
    // justified claim).
    // TODO(AGO-625): Extend `GasEstimator`?
    let estimatedGasUnits = Number(GAS_UNITS_PER_SWAP);
    const threshold =
      (uusdPerGasUnit * autoClaimConfig.minRewardPerGas) /
      (1 - autoClaimConfig.maxSlippageBps / 10_000);
    const holds: typeof picks = [];

    // First, check for already-claimed tokens.
    const claimedBalance = rewardBalances.find(b => b.instrumentName === null);
    let claimedUusdc = getUusdcValue(BigInt(claimedBalance?.amount || 0n));
    if (claimedUusdc > 0n) {
      holds.push({
        ...claimedBalance!,
        uusdcValue: claimedUusdc,
        usdcTokenId,
        evmChainId,
      });
      if (
        Number(claimedUusdc) / estimatedGasUnits >= threshold ||
        (uusdcThreshold !== undefined && claimedUusdc >= uusdcThreshold)
      ) {
        picks.push(...holds.splice(0));
        if (picks.length >= pickLimit) return picks.slice(0, pickLimit);
      }
    }

    // Next, sources by descending value-per-gas.
    const bestRewardBalances = partialMap(rewardBalances, balance => {
      if (balance.instrumentName === null) return undefined;
      // TODO(AGO-625): Extend `GasEstimator`?
      const gasUnits = Number(
        getOwn(GAS_UNITS_PER_CLAIM, balance.tokenId.toLowerCase()),
      );
      if (!gasUnits) return undefined;
      const uusdcValue = getUusdcValue(BigInt(balance.amount));
      const uusdcPerGasUnit = Number(uusdcValue) / gasUnits;
      return uusdcValue > 0n &&
        (uusdcPerGasUnit >= threshold ||
          (uusdcThreshold !== undefined && uusdcValue >= uusdcThreshold))
        ? { balance, uusdcValue, gasUnits, uusdcPerGasUnit }
        : undefined;
    }).sort((a, b) => naiveCompare(b.uusdcPerGasUnit, a.uusdcPerGasUnit));
    for (const { balance, uusdcValue, gasUnits } of bestRewardBalances) {
      holds.push({ ...balance, uusdcValue, usdcTokenId, evmChainId });
      estimatedGasUnits += gasUnits;
      claimedUusdc += uusdcValue;
      if (
        Number(claimedUusdc) / estimatedGasUnits >= threshold ||
        (uusdcThreshold !== undefined && claimedUusdc >= uusdcThreshold)
      ) {
        picks.push(...holds.splice(0));
        if (picks.length >= pickLimit) return picks.slice(0, pickLimit);
      }
    }
  }
  return picks.length > 0 ? picks : null;
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

export type AutoPowers = {
  autoClaimConfig: AutoClaimConfig;
  /** for end-to-end testing of specific portfolios */
  autoClaimUusdcThresholds?: Record<PortfolioKey, bigint>;
  autoRebalance: AutoRebalanceConfig;
  console: Pick<Console, 'error' | 'log' | 'warn'>;
  depositBrand: Brand<'nat'>;
  feeBrand: Brand<'nat'>;
  exchangeRates?: RewardTokenRate[];
  gasCosts?: ChainGasState[];
  gasEstimator: GasEstimator;
  getWalletInvocationUpdate: (messageId: string | number) => Promise<unknown>;
  inspectForStdout: (obj: unknown, options?: InspectOptions) => string;
  instrumentBlocks?: InstrumentBlocks;
  instrumentLiquidity?: InstrumentLiquidity;
  isDryRun?: boolean;
  makeNonce: () => string;
  network: NetworkSpec;
  merklClient?: KyInstance;
  oneInchClient?: KyInstance;
  planRebalanceToAllocations: (details: {
    path: string;
    flowDetail: { type: 'rebalance' };
    currentBalances: Partial<Record<AssetPlaceRef, NatAmount>>;
    policyVersion: number;
    rebalanceCount: number;
    targetAllocation: StatusFor['portfolio']['targetAllocation'];
    network: NetworkSpec;
    instrumentBlocks?: InstrumentBlocks;
    instrumentLiquidity?: InstrumentLiquidity;
    brand: Brand<'nat'>;
    feeBrand: Brand<'nat'>;
    gasEstimator: GasEstimator;
  }) => Promise<FundsFlowPlan>;
  portfoliosPathPrefix: string;
  postYdsTransaction?: (txHash: string) => Promise<void>;
  usdcTokensByChain: Partial<Record<SupportedChain, string>>;
  walletStore: ReturnType<typeof reflectWalletStore>;
  GAS_UNITS_PER_CLAIM: Record<string, bigint>;
  GAS_UNITS_PER_SWAP: bigint;
};

/**
 * Automatic reward claims are disabled until they build plans selecting
 * attestor-signed claim evidence and swap instructions, which the contract
 * now requires instead of the claim and swap details it used to accept.
 *
 * TODO(AGO-625): request signed evidence from YDS and submit it with a
 * selector-based plan.
 */
export const maybeAutoClaim = async (
  _portfolioStatus: StatusFor['portfolio'],
  _portfolioKey: PortfolioKey,
  _tokenBalances: YdsTokenBalance[],
  _powers: AutoPowers,
): Promise<string | undefined> => undefined;

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
    instrumentLiquidity,
    isDryRun,
    makeNonce,
    network,
    planRebalanceToAllocations,
    portfoliosPathPrefix,
    postYdsTransaction,
    walletStore,
  }: AutoPowers,
): Promise<string | undefined> => {
  const { enabledAutoFeatures, targetAllocation } = portfolioStatus;
  if (!enabledAutoFeatures?.rebalance || !targetAllocation) return;

  const path = `${portfoliosPathPrefix}.${portfolioKey}`;
  const portfolioId = portfolioIdFromKey(portfolioKey);
  const logPrefix = `[${portfolioKey}.autoRebalance]`;
  const { policyVersion, rebalanceCount } = portfolioStatus;
  const syncState = { policyVersion, rebalanceCount } as const;

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
    instrumentLiquidity,
    withdrawalLiquidityLimitBps: WITHDRAWAL_LIQUIDITY_LIMIT_BPS,
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
    const planReceiver = walletStore.get<PortfolioPlanner>('planner', txOpts);
    const agentMemo = makeNonce().trim();
    agentMemo || Fail`makeNonce returned an empty agentMemo`;
    const { tx, id } = await planReceiver.rebalance(
      portfolioId,
      { syncState, agentMemo },
      planOrSteps,
    );
    if (!isDryRun) {
      void getWalletInvocationUpdate(id as any).catch(err => {
        console.warn(logPrefix, '⚠️ Failure for rebalance', err);
      });
      void postYdsTransaction?.(tx.transactionHash).catch(err => {
        console.error(
          logPrefix,
          '🚨 Failure posting transaction to YDS',
          { txHash: tx.transactionHash, agentMemo },
          err,
        );
      });
    }
    console.log(
      logPrefix,
      'rebalance',
      inspectForStdout({ ...logContext, plan }),
      tx,
    );
    return tx.transactionHash;
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
