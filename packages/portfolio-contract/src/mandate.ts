/** @file Quantitative checks for delegated target allocations. */
import {
  isInterChainAccountRef,
  type PlanObservations,
  type PortfolioPermissions,
  type TargetAllocation,
} from '@agoric/portfolio-api';
import { Fail } from '@endo/errors';

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
  const totalPortions = Object.values(targetAllocation).reduce(
    (sum, portion = 0n) => sum + portion,
    0n,
  );
  const maxScaledPortion = maxWeightBps * totalPortions;

  for (const [instrument, portion = 0n] of Object.entries(targetAllocation)) {
    if (isInterChainAccountRef(instrument)) continue;
    totalPortions > 0n || Fail`mandate.maxWeight.zeroTotal:${instrument}`;
    portion * 10_000n <= maxScaledPortion ||
      Fail`mandate.maxWeight:${instrument}`;
  }
};
harden(assertMandateForAllocation);

const MICRO_USDC_PER_USD = 1_000_000n;

/**
 * Check observation-dependent limits against the evidence attached to a plan.
 * The observations are planner assertions, not independent attestations.
 */
export const assertMandateForPlanObservations = (
  permissions: PortfolioPermissions,
  targetAllocation: TargetAllocation,
  observations: PlanObservations,
): void => {
  const allocation = permissions.allocation;
  if (typeof allocation !== 'object') return;
  const { minVaultTvlUsd, maxVaultShareBps } = allocation;
  if (minVaultTvlUsd === undefined && maxVaultShareBps === undefined) return;
  const totalPortions = Object.values(targetAllocation).reduce(
    (sum, portion = 0n) => sum + portion,
    0n,
  );
  const portfolioValueMicroUsd = Object.values(observations.balances).reduce(
    (sum, balance = 0n) => sum + balance,
    0n,
  );

  for (const [instrument, portion = 0n] of Object.entries(targetAllocation)) {
    if (isInterChainAccountRef(instrument)) continue;

    const status = observations.instrumentTvls[instrument];
    status || Fail`mandate.instrumentData.missing:${instrument}`;
    if (minVaultTvlUsd !== undefined) {
      status.tvlUsd >= minVaultTvlUsd ||
        Fail`mandate.minVaultTvl:${instrument}`;
    }
    if (maxVaultShareBps !== undefined) {
      totalPortions > 0n || Fail`mandate.maxVaultShare.zeroTotal:${instrument}`;
      portfolioValueMicroUsd * portion * 10_000n <=
        status.tvlUsd *
          MICRO_USDC_PER_USD *
          totalPortions *
          BigInt(maxVaultShareBps) || Fail`mandate.maxVaultShare:${instrument}`;
    }
  }
};
harden(assertMandateForPlanObservations);
