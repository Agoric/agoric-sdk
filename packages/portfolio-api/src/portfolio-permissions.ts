import type { TypedPattern } from '@agoric/internal';
import { type CopyRecord } from '@endo/pass-style';
import { M } from '@endo/patterns';

/**
 * Portfolio permissions granted to an automation agent.
 *
 * `allocation`: whether the agent may change portions of instruments already in the
 * portfolio's `targetAllocation`, but may not add or remove keys.
 */
export type PortfolioPermissions = {
  allocation?: boolean;
  [permission: string]: unknown;
} & CopyRecord;

/**
 * Version 1 wire shape for EIP-712 grant permissions.
 *
 * The current signed payload supports only the `allocation` permission.
 */
export const PortfolioPermissionsV1Shape: TypedPattern<{
  allocation: boolean;
}> = M.splitRecord({ allocation: M.boolean() }, {}, {});

/**
 * Extensible app-level shape for portfolio permissions.
 *
 * Future versions may add more boolean permission keys while preserving the
 * broad `PortfolioPermissions` type throughout the rest of the system.
 */
export const PortfolioPermissionsExtShape: TypedPattern<PortfolioPermissions> =
  M.recordOf(M.string(), M.any());
