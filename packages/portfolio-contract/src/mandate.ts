/** @file Quantitative checks for delegated target allocations. */
import type {
  PortfolioPermissions,
  StatusFor,
  TargetAllocation,
} from '@agoric/portfolio-api';
import { Fail } from '@endo/errors';

export type InstrumentStatusReader = (
  instrument: string,
) => StatusFor['instrument'] | undefined;

/**
 * Check a proposed allocation against the current delegation permissions.
 * All checks run before policy mutation or flow creation.
 */
export const assertMandateForAllocation = (
  permissions: PortfolioPermissions,
  targetAllocation: TargetAllocation,
  getInstrumentStatus: InstrumentStatusReader,
  portfolioValueUsd?: bigint,
): void => {
  const allocation = permissions.allocation;
  if (typeof allocation !== 'object') return;
  const { instruments = {} } = allocation;
  const totalPortions = Object.values(targetAllocation).reduce(
    (sum, portion = 0n) => sum + portion,
    0n,
  );

  for (const [instrument, portion = 0n] of Object.entries(targetAllocation)) {
    const constraint = instruments[instrument];
    if (!constraint) continue;
    const { maxWeightBps, minVaultTvlUsd, maxVaultShareBps } = constraint;

    if (maxWeightBps !== undefined && !instrument.startsWith('@')) {
      totalPortions > 0n || Fail`mandate.maxWeight.zeroTotal:${instrument}`;
      portion * 10_000n <= BigInt(maxWeightBps) * totalPortions ||
        Fail`mandate.maxWeight:${instrument}`;
    }

    let status: StatusFor['instrument'] | undefined;
    if (minVaultTvlUsd !== undefined || maxVaultShareBps !== undefined) {
      status = getInstrumentStatus(instrument);
      status || Fail`mandate.instrumentData.missing:${instrument}`;
    }
    if (minVaultTvlUsd !== undefined) {
      status!.tvlUsd >= minVaultTvlUsd ||
        Fail`mandate.minVaultTvl:${instrument}`;
    }
    if (maxVaultShareBps !== undefined) {
      const valueUsd =
        portfolioValueUsd ?? Fail`mandate.portfolioValue.missing:${instrument}`;
      totalPortions > 0n || Fail`mandate.maxVaultShare.zeroTotal:${instrument}`;
      valueUsd * portion * 10_000n <=
        status!.tvlUsd * totalPortions * BigInt(maxVaultShareBps) ||
        Fail`mandate.maxVaultShare:${instrument}`;
    }
  }
};
harden(assertMandateForAllocation);
