import type { InspectOptions } from 'node:util';
import { inspect } from 'node:util';

import type {
  FlowDetail,
  FundsFlowPlan,
  MovementDesc,
  PortfolioKey,
} from '@agoric/portfolio-api';
import type { StatusFor } from '@aglocal/portfolio-contract/src/type-guards.ts';
import { portfolioIdFromKey } from '@aglocal/portfolio-contract/src/type-guards.ts';
import type { PortfolioPlanner } from '@aglocal/portfolio-contract/src/planner.exo.ts';

import { makePortfolioFlowPlan, type StartFlowPowers } from './engine.ts';

export const DEFAULT_REBALANCE_SCAN_PERIOD_S = 7 * 24 * 60 * 60;

type StepWithGasEstimate = MovementDesc & {
  gasEstimate?: bigint | number | string;
};

export type GasPrices =
  | bigint
  | number
  | string
  | Partial<Record<string, bigint | number | string>>
  | { gasPrices: GasPrices };

export type RebalanceScannerPortfolio = {
  portfolioKey: PortfolioKey;
  status: StatusFor['portfolio'];
};

export type RebalanceScannerPowers = StartFlowPowers & {
  queryPortfolios: (
    notRebalancedSince: number,
  ) => Promise<RebalanceScannerPortfolio[]>;
  queryGasPrices: () => Promise<GasPrices>;
  sleep: (seconds: number) => Promise<void>;
  now: () => number;
};

const inspectOpts: InspectOptions = { depth: 4 };

const toBigint = (value: bigint | number | string | undefined): bigint => {
  if (value === undefined) return 0n;
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(Math.trunc(value));
  return BigInt(value);
};

const placeGasKeys = ({ src, dest }: MovementDesc) =>
  [src, dest]
    .map(place =>
      String(place)
        .replace(/^[+@<-]+/, '')
        .replace(/[>]+$/, ''),
    )
    .filter(Boolean);

const gasPriceForStep = (gasPrices: GasPrices, step: MovementDesc): bigint => {
  if (
    typeof gasPrices === 'object' &&
    gasPrices !== null &&
    'gasPrices' in gasPrices
  ) {
    const nested = (gasPrices as { gasPrices: GasPrices }).gasPrices;
    return gasPriceForStep(nested, step);
  }
  if (
    typeof gasPrices === 'bigint' ||
    typeof gasPrices === 'number' ||
    typeof gasPrices === 'string'
  ) {
    return toBigint(gasPrices);
  }
  for (const key of placeGasKeys(step)) {
    const price = gasPrices[key];
    if (price !== undefined) return toBigint(price);
  }
  return 0n;
};

const gasEstimateForStep = (step: StepWithGasEstimate): bigint =>
  toBigint(
    step.gasEstimate ??
      step.fee?.value ??
      step.detail?.gasEstimate ??
      step.detail?.gas,
  );

const dependenciesFor = (plan: FundsFlowPlan, stepIndex: number): number[] => {
  if (!plan.order) {
    return stepIndex === 0 ? [] : [stepIndex - 1];
  }
  const entry = plan.order.find(([idx]) => idx === stepIndex);
  return entry?.[1] ?? [];
};

export const filterGasFavorablePlan = (
  plan: FundsFlowPlan,
  gasPrices: GasPrices,
): FundsFlowPlan => {
  const removed = new Set<number>();
  for (let i = 0; i < plan.flow.length; i += 1) {
    const step = plan.flow[i] as StepWithGasEstimate;
    const gasCost = gasEstimateForStep(step) * gasPriceForStep(gasPrices, step);
    if (gasCost >= step.amount.value / 2n) {
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

  const gasPrices = await queryGasPrices();
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
      const filteredPlan = filterGasFavorablePlan(plan, gasPrices);
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
