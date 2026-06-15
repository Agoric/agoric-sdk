import type { InspectOptions } from 'node:util';
import { inspect } from 'node:util';

import type {
  FlowDetail,
  FundsFlowPlan,
  MovementDesc,
  PortfolioKey,
} from '@agoric/portfolio-api';
import { chainOf } from '@agoric/portfolio-api/src/places.js';
import type { StatusFor } from '@aglocal/portfolio-contract/src/type-guards.ts';
import { portfolioIdFromKey } from '@aglocal/portfolio-contract/src/type-guards.ts';
import type { PortfolioPlanner } from '@aglocal/portfolio-contract/src/planner.exo.ts';

import { makePortfolioFlowPlan, type StartFlowPowers } from './engine.ts';

export const DEFAULT_REBALANCE_SCAN_PERIOD_S = 7 * 24 * 60 * 60;

export type ChainGasState = {
  caip2Id: string;
  chainName: string;
  gasDenom: string;
  gasDenomScale: number;
  current: {
    latestScaledGasDenomPerGasUnit: number;
    takenAtSec: number;
  };
  windows: Array<{
    window: string;
    until: string;
    mean: number;
    p50: number;
    p90: number;
    sampleCount: number;
  }>;
  recent: Array<{
    takenAtSec: number;
    scaledGasDenomPerGasUnit: number;
  }>;
};

export type GasStateResponse = {
  message: 'Gas data retrieved successfully';
  data: ChainGasState[];
  timestamp: string;
};

export type RebalanceScannerPortfolio = {
  portfolioKey: PortfolioKey;
  status: StatusFor['portfolio'];
};

export type RebalanceScannerPowers = StartFlowPowers & {
  queryPortfolios: (
    notRebalancedSince: number,
  ) => Promise<RebalanceScannerPortfolio[]>;
  queryGasPrices: () => Promise<GasStateResponse>;
  sleep: (seconds: number) => Promise<void>;
  now: () => number;
};

const inspectOpts: InspectOptions = { depth: 4 };
const GAS_STATS_WINDOW = 'P30D';

const chainNamesForStep = ({ src, dest }: MovementDesc): string[] => {
  const chainNames = [src, dest]
    .map(place => chainOf(place))
    .filter(chainName => chainName !== 'agoric' && chainName !== 'noble');
  return [...new Set(chainNames)];
};

const gasFavorableForStep = (
  gasStateByChainName: Map<string, ChainGasState>,
  step: MovementDesc,
): boolean => {
  const chainNames = chainNamesForStep(step);
  if (chainNames.length === 0) return true;

  for (const chainName of chainNames) {
    const gasState = gasStateByChainName.get(chainName);
    if (!gasState) continue;
    const p30d = gasState.windows.find(
      ({ window }) => window === GAS_STATS_WINDOW,
    );
    return (
      !!p30d &&
      gasState.current.latestScaledGasDenomPerGasUnit * 2 < p30d.p50 * 3
    );
  }
  return false;
};

const dependenciesFor = (plan: FundsFlowPlan, stepIndex: number): number[] => {
  if (!plan.order) {
    return stepIndex === 0 ? [] : [stepIndex - 1];
  }
  const entry = plan.order.find(([idx]) => idx === stepIndex);
  return entry?.[1] ?? [];
};

export const filterGasFavorablePlan = (
  plan: FundsFlowPlan,
  gasState: GasStateResponse,
): FundsFlowPlan => {
  const removed = new Set<number>();
  const gasStateByChainName = new Map(
    gasState.data.map(chainGasState => [
      chainGasState.chainName,
      chainGasState,
    ]),
  );
  for (let i = 0; i < plan.flow.length; i += 1) {
    if (!gasFavorableForStep(gasStateByChainName, plan.flow[i])) {
      removed.add(i);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < plan.flow.length; i += 1) {
      if (removed.has(i)) continue;
      if (dependenciesFor(plan, i).some(dep => removed.has(dep))) {
        removed.add(i);
        changed = true;
      }
    }
  }

  if (removed.size === 0) return plan;

  const oldToNew = new Map<number, number>();
  const flow = plan.flow.filter((_step, oldIndex) => {
    if (removed.has(oldIndex)) return false;
    oldToNew.set(oldIndex, oldToNew.size);
    return true;
  });
  const order = plan.order
    ?.flatMap(([oldIndex, oldPrerequisites]) => {
      const newIndex = oldToNew.get(oldIndex);
      if (newIndex === undefined) return [];
      const prerequisites = oldPrerequisites.flatMap(oldPrerequisite => {
        const newPrerequisite = oldToNew.get(oldPrerequisite);
        return newPrerequisite === undefined ? [] : [newPrerequisite];
      });
      return prerequisites.length ? ([[newIndex, prerequisites]] as const) : [];
    })
    .map(([idx, prerequisites]) => [idx, prerequisites] as [number, number[]]);
  return harden({ flow, order });
};
harden(filterGasFavorablePlan);

export const scanRebalanceOnce = async (
  {
    console,
    walletStore,
    getWalletInvocationUpdate,
    isDryRun,
    queryPortfolios,
    queryGasPrices,
    now,
    ...powers
  }: RebalanceScannerPowers,
  rebalanceScanPeriodS = DEFAULT_REBALANCE_SCAN_PERIOD_S,
) => {
  const notRebalancedSince = Math.round(now() - rebalanceScanPeriodS * 1000);
  const portfolios = await queryPortfolios(notRebalancedSince);
  if (portfolios.length === 0) return;

  for (const { portfolioKey, status } of portfolios) {
    const logPrefix = `[rebalance-scanner.${portfolioKey}]`;
    try {
      const flowDetail: FlowDetail = harden({ type: 'rebalance' });
      const { plan, currentBalances, logContext } = await makePortfolioFlowPlan(
        status,
        flowDetail,
        {
          ...powers,
          console,
          walletStore,
          getWalletInvocationUpdate,
          isDryRun,
        },
      );
      const gasState = await queryGasPrices();
      const filteredPlan = filterGasFavorablePlan(plan, gasState);
      if (filteredPlan.flow.length === 0) {
        console.warn(logPrefix, 'skipping empty gas-favorable plan');
        continue;
      }

      const txOpts = { sendOnly: true };
      const planReceiver = walletStore.get<PortfolioPlanner>('planner', txOpts);
      const portfolioId = portfolioIdFromKey(portfolioKey);
      const { policyVersion, rebalanceCount } = status;
      const { tx, id } = await planReceiver.submit(
        portfolioId,
        filteredPlan.flow,
        policyVersion,
        rebalanceCount,
      );
      if (!isDryRun) {
        void getWalletInvocationUpdate(id as any).catch(err => {
          console.warn(logPrefix, '⚠️ Failure for submit', err);
        });
      }
      console.log(
        logPrefix,
        'submit',
        currentBalances,
        inspect({ ...logContext, plan, filteredPlan }, inspectOpts),
        tx,
      );
    } catch (err) {
      console.error(logPrefix, '🚨 rebalance scan failed', err);
    }
  }
};
harden(scanRebalanceOnce);

export const startRebalanceScanner = async (
  powers: RebalanceScannerPowers,
  rebalanceScanPeriodS = DEFAULT_REBALANCE_SCAN_PERIOD_S,
) => {
  for (;;) {
    try {
      await scanRebalanceOnce(powers, rebalanceScanPeriodS);
    } catch (err) {
      powers.console.error('🚨 rebalance scan iteration failed', err);
    }
    await powers.sleep(rebalanceScanPeriodS);
  }
};
harden(startRebalanceScanner);
