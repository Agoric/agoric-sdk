import { mustMatch, type TypedPattern } from '@agoric/internal';
import { Fail, q } from '@endo/errors';
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
  /** whether the agent may trigger a claim of external protocol rewards. */
  claimRewards?: boolean;
};

export type PortfolioAllocationPermissions = {
  /**
   * Maximum target allocation weight for any non-cash instrument as measured
   * over the sum of all target allocations (cash and non-cash), in basis points.
   */
  maxWeightBps?: bigint;
  /**
   * Minimum underlying vault TVL for any applicable instrument with non-zero
   * weight, in USD.
   */
  minVaultTvlUsd?: bigint;
  /**
   * Maximum share of the underlying vault's TVL for any applicable instrument
   * with non-zero weight, in basis points.
   */
  maxVaultShareBps?: bigint;
};

/**
 * Forward-compatible envelope for stored or internally routed portfolio
 * permissions. It may carry future permission keys that this version does not
 * yet understand, so contract entry points must validate against
 * `PortfolioPermissionsShape` before granting authority.
 */
export type PortfolioPermissionsExt = PortfolioPermissions & CopyRecord<any>;

const BpsShape = M.and(M.nat(), M.lte(10_000n));

/**
 * The currently implemented permissions. Granted permissions must match this shape.
 *
 * The empty bag `{}` is valid and represents no delegated authority. End-user
 * grant paths may still require specific permissions before creating a grant.
 */
export const PortfolioAllocationPermissionsShape: TypedPattern<PortfolioAllocationPermissions> =
  M.splitRecord(
    {},
    {
      maxWeightBps: BpsShape,
      minVaultTvlUsd: M.nat(),
      maxVaultShareBps: BpsShape,
    },
    {},
  );

export const PortfolioPermissionsShape: TypedPattern<PortfolioPermissions> =
  M.splitRecord(
    {},
    {
      allocation: M.or(M.boolean(), PortfolioAllocationPermissionsShape),
      rebalance: M.boolean(),
      claimRewards: M.boolean(),
    },
    {},
  );

export const PortfolioPermissionsEIP712Shape: TypedPattern<PortfolioPermissionsEIP712> =
  M.or(
    M.splitRecord(
      { allocation: true },
      {
        maxWeightBps: BpsShape,
        minVaultTvlUsd: M.bigint(),
        maxVaultShareBps: BpsShape,
      },
      {},
    ),
    M.splitRecord({}, {}, {}),
    M.splitRecord({ allocation: false }, {}, {}),
  );

/** Convert the signed external representation to the application record. */
export const portfolioPermissionsFromEIP712 = (
  wire: PortfolioPermissionsEIP712,
): PortfolioPermissions => {
  mustMatch(wire, PortfolioPermissionsEIP712Shape);
  const { allocation, maxWeightBps, minVaultTvlUsd, maxVaultShareBps } = wire;
  const hasConstraints =
    maxWeightBps !== undefined ||
    minVaultTvlUsd !== undefined ||
    maxVaultShareBps !== undefined;

  const permissions: PortfolioPermissions = harden(
    hasConstraints
      ? {
          allocation: {
            ...(maxWeightBps !== undefined && { maxWeightBps }),
            ...(minVaultTvlUsd !== undefined && { minVaultTvlUsd }),
            ...(maxVaultShareBps !== undefined && { maxVaultShareBps }),
          },
        }
      : {
          ...(allocation !== undefined && { allocation }),
        },
  );
  mustMatch(permissions, PortfolioPermissionsShape);
  return harden(permissions);
};

/**
 * User-facing permissions accepted by signed EIP-712 grant helpers today.
 * Unlike `PortfolioPermissionsExt`, this is intentionally narrow: callers may
 * express allocation authority, but not internal/planner-only permissions such
 * as `rebalance` or `claimRewards`.
 */
export type UserFacingPortfolioPermissions = Omit<
  PortfolioPermissions,
  'rebalance' | 'claimRewards'
> & { rebalance?: never; claimRewards?: never };

/** Convert user-facing permissions to the intentionally narrower EIP-712 form. */
export const portfolioPermissionsToEIP712 = (
  permissions: UserFacingPortfolioPermissions,
): PortfolioPermissionsEIP712 => {
  mustMatch(permissions, PortfolioPermissionsShape);
  for (const authority of ['rebalance', 'claimRewards'] as const) {
    !Object.hasOwn(permissions, authority) ||
      Fail`${q(authority)} is not supported by user-facing permissions`;
  }
  const { allocation } = permissions;
  if (allocation === undefined) {
    return harden({});
  }
  if (typeof allocation === 'boolean') {
    return harden({ allocation });
  }
  const { maxWeightBps, minVaultTvlUsd, maxVaultShareBps } = allocation;
  return harden({
    allocation: true,
    ...(maxWeightBps !== undefined && { maxWeightBps }),
    ...(minVaultTvlUsd !== undefined && { minVaultTvlUsd }),
    ...(maxVaultShareBps !== undefined && { maxVaultShareBps }),
  });
};

/**
 * The authority actually conferred by a {@link PortfolioPermissions} record,
 * after inheritance. Unlike the stored (or signed) permission keys, every
 * authority is resolved to a boolean, and none is ever absent.
 */
export type EffectivePortfolioPermissions = {
  allocation: boolean;
  rebalance: boolean;
  claimRewards: boolean;
};

/**
 * Resolve the effective authority of stored permissions, using **stepwise**
 * inheritance down the chain `allocation` → `rebalance` → `claimRewards`:
 *
 * - `allocation` is granted by `true` or by a constraint object (even `{}`),
 *   and denied when absent or `false`.
 * - an absent `rebalance` inherits the effective `allocation`.
 * - an absent `claimRewards` inherits the effective `rebalance`.
 *
 * An explicit `false` therefore blocks inheritance by lower permissions: with
 * `{ allocation: true, rebalance: false }`, `claimRewards` is denied. An
 * explicit `true` is an independent grant, regardless of higher permissions.
 *
 * This is the single source of truth for every consumer (contract, YDS,
 * MCP, planner), including the planner's own auto-feature opt-out. Callers
 * are expected to have validated `permissions` against
 * {@link PortfolioPermissionsShape} when they come from an untrusted source.
 *
 * @param permissions
 */
export const getEffectivePortfolioPermissions = (
  permissions: PortfolioPermissions,
): EffectivePortfolioPermissions => {
  const { allocation, rebalance, claimRewards } = permissions;
  const effectiveAllocation = allocation !== undefined && allocation !== false;
  const effectiveRebalance = rebalance ?? effectiveAllocation;
  const effectiveClaimRewards = claimRewards ?? effectiveRebalance;
  return harden({
    allocation: effectiveAllocation,
    rebalance: effectiveRebalance,
    claimRewards: effectiveClaimRewards,
  });
};
harden(getEffectivePortfolioPermissions);

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
  claimRewards?: boolean;
};

/**
 * Shape enforcing the current known auto-features accepted by the system.
 * Changes to this shape should be backward compatible.
 */
export const PortfolioAutoFeaturesShape: TypedPattern<PortfolioAutoFeatures> =
  M.splitRecord({}, { rebalance: M.boolean(), claimRewards: M.boolean() }, {});

export const PortfolioAutoFeaturesEIP712Shape: TypedPattern<PortfolioAutoFeaturesEIP712> =
  M.splitRecord({}, { rebalance: M.boolean(), claimRewards: M.boolean() }, {});

/** Extensible type compatible with future auto-features definitions */
export type PortfolioAutoFeaturesExt = PortfolioAutoFeatures & CopyRecord<any>;

/** Shape for storing auto-features in a forward compatible way. */
export const PortfolioAutoFeaturesExtShape: TypedPattern<PortfolioAutoFeaturesExt> =
  M.recordOf(M.string(), M.any());
