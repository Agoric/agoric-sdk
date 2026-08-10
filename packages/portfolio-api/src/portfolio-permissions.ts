import { mustMatch, type TypedPattern } from '@agoric/internal';
import { Fail } from '@endo/errors';
import { type CopyRecord } from '@endo/pass-style';
import { M } from '@endo/patterns';
import type {
  PortfolioAutoFeaturesEIP712,
  PortfolioPermissionsEIP712,
} from './evm-wallet/eip712-messages.ts';

/**
 * Portfolio permissions granted to an automation agent.
 */
export type PortfolioPermissions = {
  /**
   * whether the agent may change portions of instruments already in the
   * portfolio's `targetAllocation`, but may not add or remove keys.
   */
  allocation?: boolean | PortfolioAllocationPermissions;
  /** whether the agent may trigger a rebalance using the current policy. */
  rebalance?: boolean;
};

export type PortfolioAllocationPermissions = {
  /** Quantitative limits keyed by instrument ID. */
  instruments?: Record<string, PortfolioInstrumentPermissions>;
};

export type PortfolioInstrumentPermissions = {
  /** Maximum portfolio weight for this non-cash position, in basis points. */
  maxWeightBps?: number;
  /** Minimum eligible underlying vault TVL, in whole USD. */
  minVaultTvlUsd?: bigint;
  /** Maximum position share of its underlying vault TVL, in basis points. */
  maxVaultShareBps?: number;
};

/**
 * Extensible app-level type for portfolio permissions.
 */
export type PortfolioPermissionsExt = PortfolioPermissions & CopyRecord<any>;

/**
 * The currently implemented permissions. Granted permissions must match this shape.
 *
 * The empty bag `{}` is valid and represents no delegated authority. End-user
 * grant paths may still require specific permissions before creating a grant.
 */
export const PortfolioInstrumentPermissionsShape: TypedPattern<PortfolioInstrumentPermissions> =
  M.splitRecord(
    {},
    {
      maxWeightBps: M.and(M.number(), M.gte(0), M.lte(10_000)),
      minVaultTvlUsd: M.nat(),
      maxVaultShareBps: M.and(M.number(), M.gte(0), M.lte(10_000)),
    },
    {},
  );

export const PortfolioAllocationPermissionsShape: TypedPattern<PortfolioAllocationPermissions> =
  M.splitRecord(
    {},
    {
      instruments: M.recordOf(M.string(), PortfolioInstrumentPermissionsShape),
    },
    {},
  );

export const PortfolioPermissionsShape: TypedPattern<PortfolioPermissions> =
  M.splitRecord(
    {},
    {
      allocation: M.or(M.boolean(), PortfolioAllocationPermissionsShape),
      rebalance: M.boolean(),
    },
    {},
  );

export const PortfolioPermissionsEIP712Shape: TypedPattern<PortfolioPermissionsEIP712> =
  M.splitRecord(
    { allocation: M.boolean() },
    {
      allocationMaxWeights: M.arrayOf(
        M.splitRecord({ instrument: M.string(), maxWeightBps: M.number() }),
      ),
      allocationMinVaultTvls: M.arrayOf(
        M.splitRecord({ instrument: M.string(), minVaultTvlUsd: M.bigint() }),
      ),
      allocationMaxVaultShares: M.arrayOf(
        M.splitRecord({
          instrument: M.string(),
          maxVaultShareBps: M.number(),
        }),
      ),
    },
    {},
  );

const assertBasisPoints = (value: number, name: string): void => {
  Number.isSafeInteger(value) || Fail`${name} must be a safe integer`;
  (value >= 0 && value <= 10_000) || Fail`${name} must be between 0 and 10000`;
};

/** Validate the complete, authority-bearing application permissions record. */
export const assertPortfolioPermissions: (
  specimen: unknown,
) => asserts specimen is PortfolioPermissions = specimen => {
  mustMatch(specimen, PortfolioPermissionsShape);
  if (
    typeof specimen === 'object' &&
    specimen !== null &&
    typeof (specimen as PortfolioPermissions).allocation === 'object'
  ) {
    const { instruments = {} } = (specimen as PortfolioPermissions)
      .allocation as PortfolioAllocationPermissions;
    for (const [instrument, constraint] of Object.entries(instruments)) {
      const { maxWeightBps, maxVaultShareBps } = constraint;
      if (maxWeightBps !== undefined) {
        assertBasisPoints(maxWeightBps, `${instrument}.maxWeightBps`);
      }
      if (maxVaultShareBps !== undefined) {
        assertBasisPoints(maxVaultShareBps, `${instrument}.maxVaultShareBps`);
      }
    }
  }
};

/** Convert the signed external representation to the application record. */
export const portfolioPermissionsFromEIP712 = (
  wire: PortfolioPermissionsEIP712,
): PortfolioPermissions => {
  mustMatch(wire, PortfolioPermissionsEIP712Shape);
  const {
    allocation,
    allocationMaxWeights,
    allocationMinVaultTvls,
    allocationMaxVaultShares,
  } = wire;
  const hasConstraints =
    allocationMaxWeights !== undefined ||
    allocationMinVaultTvls !== undefined ||
    allocationMaxVaultShares !== undefined;
  allocation ||
    !hasConstraints ||
    Fail`allocation constraints require allocation authority`;

  const instruments: Record<string, PortfolioInstrumentPermissions> = {};
  const addConstraint = (
    instrument: string,
    constraint: PortfolioInstrumentPermissions,
  ) => {
    const previous = instruments[instrument] || {};
    for (const key of Object.keys(constraint)) {
      Object.hasOwn(previous, key) &&
        Fail`duplicate ${key} constraint for ${instrument}`;
    }
    instruments[instrument] = { ...previous, ...constraint };
  };
  for (const { instrument, maxWeightBps } of allocationMaxWeights || []) {
    addConstraint(instrument, { maxWeightBps });
  }
  for (const { instrument, minVaultTvlUsd } of allocationMinVaultTvls || []) {
    addConstraint(instrument, { minVaultTvlUsd });
  }
  for (const { instrument, maxVaultShareBps } of allocationMaxVaultShares ||
    []) {
    addConstraint(instrument, { maxVaultShareBps });
  }

  const permissions: PortfolioPermissions = harden(
    hasConstraints ? { allocation: { instruments } } : { allocation },
  );
  assertPortfolioPermissions(permissions);
  return harden(permissions);
};

export type ExternalPortfolioPermissions = Omit<
  PortfolioPermissions,
  'rebalance'
> & { rebalance?: never };

/** Convert application permissions to the intentionally narrower EIP-712 form. */
export const portfolioPermissionsToEIP712 = (
  permissions: ExternalPortfolioPermissions,
): PortfolioPermissionsEIP712 => {
  assertPortfolioPermissions(permissions);
  Object.hasOwn(permissions, 'rebalance') &&
    Fail`rebalance is not supported by external permissions`;
  const { allocation = false } = permissions;
  if (typeof allocation === 'boolean') {
    return harden({ allocation });
  }
  const { instruments = {} } = allocation;
  const entries = Object.entries(instruments).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  const allocationMaxWeights = entries.flatMap(
    ([instrument, { maxWeightBps }]) =>
      maxWeightBps === undefined ? [] : [{ instrument, maxWeightBps }],
  );
  const allocationMinVaultTvls = entries.flatMap(
    ([instrument, { minVaultTvlUsd }]) =>
      minVaultTvlUsd === undefined ? [] : [{ instrument, minVaultTvlUsd }],
  );
  const allocationMaxVaultShares = entries.flatMap(
    ([instrument, { maxVaultShareBps }]) =>
      maxVaultShareBps === undefined ? [] : [{ instrument, maxVaultShareBps }],
  );
  return harden({
    allocation: true,
    ...(Object.hasOwn(allocation, 'instruments') && {
      allocationMaxWeights,
      allocationMinVaultTvls,
      allocationMaxVaultShares,
    }),
  });
};

/**
 * Extensible app-level shape for portfolio permissions.
 *
 * Future versions may add more permission keys while preserving the
 * broad `PortfolioPermissionsExt` type throughout the rest of the system.
 */
export const PortfolioPermissionsExtShape: TypedPattern<PortfolioPermissionsExt> =
  M.recordOf(M.string(), M.any());

/** A set of auto-features that can be enabled for a portfolio. */
export type PortfolioAutoFeatures = {
  rebalance?: boolean;
};

/**
 * Shape enforcing the current known auto-features accepted by the system.
 * Changes to this shape should be backward compatible.
 */
export const PortfolioAutoFeaturesShape: TypedPattern<PortfolioAutoFeatures> =
  M.splitRecord({}, { rebalance: M.boolean() }, {});

export const PortfolioAutoFeaturesEIP712Shape: TypedPattern<PortfolioAutoFeaturesEIP712> =
  M.splitRecord({ rebalance: M.boolean() });

/** Extensible type compatible with future auto-features definitions */
export type PortfolioAutoFeaturesExt = PortfolioAutoFeatures & CopyRecord<any>;

/** Shape for storing auto-features in a forward compatible way. */
export const PortfolioAutoFeaturesExtShape: TypedPattern<PortfolioAutoFeaturesExt> =
  M.recordOf(M.string(), M.any());
