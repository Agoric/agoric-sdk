import type { InspectOptions } from 'node:util';
import { inspect } from 'node:util';

import type { FlowDetail, PortfolioKey } from '@agoric/portfolio-api';
import type { StatusFor } from '@aglocal/portfolio-contract/src/type-guards.ts';
import { portfolioIdFromKey } from '@aglocal/portfolio-contract/src/type-guards.ts';
import type { PortfolioPlanner } from '@aglocal/portfolio-contract/src/planner.exo.ts';

import {
  makePortfolioFlowPlan,
  type PortfoliosFilter,
  type PortfoliosResponse,
  type StartFlowPowers,
} from './engine.ts';
import { filterGasFavorablePlan, type GasStateResponse } from './gas-prices.ts';

export const DEFAULT_AUTO_REBALANCE_PERIOD_S = 7 * 24 * 60 * 60;

export type RebalanceScannerPowers = StartFlowPowers & {
  queryPortfolios: (
    filter?: PortfoliosFilter,
  ) => Promise<PortfoliosResponse[]>;
  gasPrices: GasStateResponse;
  now: () => number;
};

const inspectOpts: InspectOptions = { depth: 4 };

const shiftRebalancePortfolioFilter = ({
  rebalancePeriodMs,
  pollPeriodMs,
}: {
  rebalancePeriodMs: number;
  pollPeriodMs: number | null;
}) => {
  if (!pollPeriodMs) return undefined;
  const bucketSize = Math.ceil(pollPeriodMs / rebalancePeriodMs);
  return {
    bucketKey: 'atBlockTime',
    bucketSize,
    numBuckets: Math.ceil(rebalancePeriodMs / bucketSize),
    // Only query the zeroth bucket, which includes all portfolios that need
    // rebalancing as of `now()`.
    bucketIndex: 0,
  };
};

export const scanRebalanceOnce = async (
  {
    console,
    walletStore,
    getWalletInvocationUpdate,
    isDryRun,
    queryPortfolios,
    gasPrices,
    now,
    ...powers
  }: RebalanceScannerPowers,
  autoRebalancePeriodS: number = DEFAULT_AUTO_REBALANCE_PERIOD_S,
  lastProcessedStampMs: number | null = null,
): Promise<void> => {
  const portfolios = await queryPortfolios(
    shiftRebalancePortfolioFilter({
      pollPeriodMs: lastProcessedStampMs ? now() - lastProcessedStampMs : null,
      rebalancePeriodMs: autoRebalancePeriodS * 1000,
    }),
  );
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
      const filteredPlan = filterGasFavorablePlan(plan, gasPrices);
      if (filteredPlan.flow.length === 0) {
        console.warn(logPrefix, 'skipping empty gas-favorable plan');
        continue;
      }

      const txOpts = { sendOnly: true };
      const planReceiver = walletStore.get<PortfolioPlanner>('planner', txOpts);
      const portfolioId = portfolioIdFromKey(portfolioKey);
      const { policyVersion, rebalanceCount } = status;
      // TODO: use the `planReceiver.rebalance` method once it is available.
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
