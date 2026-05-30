import type { TypedPattern } from '@agoric/internal';
import { M } from '@endo/patterns';

/**
 * Portfolio permissions granted to an automation agent.
 *
 * `allocation`: whether the agent may change portions of instruments already in the
 * portfolio's `targetAllocation`, but may not add or remove keys.
 */
export type PortfolioPermissions = {
  allocation?: boolean;
  [permission: string]: boolean | undefined;
};

export const PortfolioPermissionsShape: TypedPattern<PortfolioPermissions> =
  M.recordOf(M.string(), M.boolean());
