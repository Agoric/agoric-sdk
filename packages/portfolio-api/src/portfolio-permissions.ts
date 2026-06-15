import type { TypedPattern } from '@agoric/internal';
import { type CopyRecord } from '@endo/pass-style';
import { M } from '@endo/patterns';
import type {
  PortfolioAutoFeaturesEIP712,
  PortfolioPermissionsEIP712,
} from './evm-wallet/eip712-messages.ts';

const PercentShape = M.and(M.number(), M.gte(0), M.lte(100));

/**
 * Portfolio permissions granted to an automation agent.
 */
export type PortfolioPermissions = {
  /**
   * whether the agent may change portions of instruments already in the
   * portfolio's `targetAllocation`, but may not add or remove keys.
   */
  allocation?:
    | boolean
    | {
        /**
         * optional maximum integer percentage for any non-cash position in a
         * delegated `setTargetAllocation` request.
         */
        capPct?: number;
      };
  /** whether the agent may trigger a rebalance using the current policy. */
  rebalance?: boolean;
};

/**
 * Extensible app-level type for portfolio permissions.
 */
export type PortfolioPermissionsExt = PortfolioPermissions & CopyRecord<any>;

const permissionProperties = harden({
  allocation: M.or(
    M.boolean(),
    M.splitRecord({}, { capPct: PercentShape }, {}),
  ),
  rebalance: M.boolean(),
});

/**
 * The currently implemented permissions. Granted permissions must match this shape.
 *
 * The empty record `{}` is valid and represents no delegated authority. End-user
 * grant paths may still require specific permissions before creating a grant.
 */
export const PortfolioPermissionsShape: TypedPattern<PortfolioPermissions> =
  M.splitRecord({}, permissionProperties, {});

export const PortfolioPermissionsEIP712Shape: TypedPattern<PortfolioPermissionsEIP712> =
  harden({
    mayAllocate: M.boolean(),
    allocationCapPct: PercentShape,
    mayRebalance: M.boolean(),
  });

/**
 * Extensible app-level shape for portfolio permissions.
 *
 * Future versions may add new top-level permission keys while preserving the
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
