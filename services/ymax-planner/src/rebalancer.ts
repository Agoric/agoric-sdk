import type { InspectOptions } from 'node:util';
import { inspect } from 'node:util';

import type {
  FlowDetail,
  PortfolioAutoFeaturesExt,
  PortfolioKey,
  StatusFor,
} from '@agoric/portfolio-api';
import { portfolioIdFromKey } from '@aglocal/portfolio-contract/src/type-guards.ts';
import type { PortfolioPlanner } from '@aglocal/portfolio-contract/src/planner.exo.ts';

import { makePortfolioFlowPlan, type StartFlowPowers } from './engine.ts';
import {
  filterPlan,
  makeFilterStepByGasState,
  type YdsGasStateResponse,
} from './gas-prices.ts';

export const DEFAULT_AUTO_REBALANCE_PERIOD_S = 7 * 24 * 60 * 60;

export type RebalancerPowers = StartFlowPowers & {
  gasPrices: YdsGasStateResponse;
  now: () => number;
};

const inspectOpts: InspectOptions = { depth: 4 };

export const shouldRunRebalance = ({
  hasGasPrices,
  gasPricesChanged,
  enabledAutoFeatures,
  atBlockHeight,
  rebalanceExpiredHeight,
}: {
  hasGasPrices: boolean;
  gasPricesChanged: boolean;
  enabledAutoFeatures?: PortfolioAutoFeaturesExt;
  atBlockHeight?: bigint;
  rebalanceExpiredHeight: bigint;
}) =>
  hasGasPrices &&
  gasPricesChanged &&
  !!enabledAutoFeatures?.rebalance &&
  (atBlockHeight === undefined || atBlockHeight <= rebalanceExpiredHeight);
harden(shouldRunRebalance);

type Fallback = [
  methodName: string,
  action: () => Promise<{ tx: unknown; id?: string }>,
];

export const rebalancePortfolios = async (
  portfoliosToProcess: Map<
    string,
    StatusFor['portfolio'] & { atBlockHeight?: bigint }
  >,
  {
    console,
    walletStore,
    getWalletInvocationUpdate,
    isDryRun,
    gasPrices,
    ...powers
  }: RebalancerPowers,
  rebalanceExpiredHeight: bigint,
): Promise<void> => {
  if (portfoliosToProcess.size === 0) return;

  await null;
  for (const [portfolioKey, status] of portfoliosToProcess.entries()) {
    const logPrefix = `[rebalance.${portfolioKey}]`;
    try {
      const { atBlockHeight, enabledAutoFeatures } = status;
      if (
        !shouldRunRebalance({
          gasPricesChanged: !!gasPrices,
          hasGasPrices: !!gasPrices,
          enabledAutoFeatures,
          atBlockHeight,
          rebalanceExpiredHeight,
        })
      ) {
        // Still waiting.
        continue;
      }

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

      const filteredPlan = filterPlan(
        plan,
        makeFilterStepByGasState(gasPrices),
      );
      console.info(
        logPrefix,
        'filtered rebalance plan with current balances:',
        currentBalances,
        gasPrices,
        inspect({ ...logContext, plan, filteredPlan }, inspectOpts),
      );

      if (filteredPlan.flow.length === 0) {
        console.warn(logPrefix, 'skipping empty filtered plan');
        continue;
      }

      const txOpts = { sendOnly: true };
      const planReceiver = walletStore.get<PortfolioPlanner>('planner', txOpts);
      const portfolioId = portfolioIdFromKey(portfolioKey as PortfolioKey);

      // These values must be fresh, so we take them directly from the vstorage status.
      const { policyVersion, rebalanceCount } = status;

      // TODO: when `planReceiver.rebalance` is widespread, remove this fallback.
      const doSubmit = () =>
        planReceiver.submit(
          portfolioId,
          filteredPlan.flow,
          policyVersion,
          rebalanceCount,
        );
      const doRebalance = () =>
        planReceiver.rebalance(
          portfolioId,
          filteredPlan,
          policyVersion,
          rebalanceCount,
        );
      const REBALANCE_FALLBACKS: Fallback[] = [
        ['rebalance', doRebalance],
        ['submit', doSubmit],
      ];

      const invokeFallbacks = async (fallbacks: readonly Fallback[]) => {
        const [methodName, action] = fallbacks[0];
        const { tx, id } = await action();
        if (!isDryRun) {
          void getWalletInvocationUpdate(id as any).catch(async err => {
            const nextFallbacks: readonly Fallback[] = fallbacks.slice(1);
            if (!nextFallbacks[0]) {
              console.error(
                logPrefix,
                '🚨 wallet invocation failed; no more fallbacks:',
                err,
              );
              return;
            }
            const [nextMethodName] = nextFallbacks[0];
            console.warn(
              logPrefix,
              `⚠️ Falling back from ${methodName} to ${nextMethodName} due to wallet invocation failure:`,
              err,
            );
            await invokeFallbacks(nextFallbacks);
          });
        }
        console.log(
          logPrefix,
          methodName,
          currentBalances,
          inspect({ ...logContext, plan, filteredPlan }, inspectOpts),
          tx,
        );
      };

      await invokeFallbacks(REBALANCE_FALLBACKS);
    } catch (err) {
      console.error(logPrefix, '🚨 rebalance', portfolioKey, 'failed:', err);
    } finally {
      portfoliosToProcess.delete(portfolioKey);
    }
  }
};
harden(rebalancePortfolios);
