import type { TypedPattern } from '@agoric/internal';
import { type CopyRecord } from '@endo/pass-style';
import { M } from '@endo/patterns';
import type { PortfolioPermissionsEIP712 } from './evm-wallet/eip712-messages.ts';

/**
 * Portfolio permissions granted to an automation agent.
 */
export type PortfolioPermissions = {
  /**
   * whether the agent may change portions of instruments already in the
   * portfolio's `targetAllocation`, but may not add or remove keys.
   */
  allocation?: boolean;
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
export const PortfolioPermissionsShape: TypedPattern<PortfolioPermissions> =
  M.splitRecord({}, { allocation: M.boolean() }, {});

export const PortfolioPermissionsEIP712Shape: TypedPattern<PortfolioPermissionsEIP712> =
  M.splitRecord({ allocation: M.boolean() });

/**
 * Extensible app-level shape for portfolio permissions.
 *
 * Future versions may add more permission keys while preserving the
 * broad `PortfolioPermissionsExt` type throughout the rest of the system.
 */
export const PortfolioPermissionsExtShape: TypedPattern<PortfolioPermissionsExt> =
  M.recordOf(M.string(), M.any());
