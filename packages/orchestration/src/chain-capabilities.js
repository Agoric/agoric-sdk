/**
 * @file Contains ChainInfo that not available from a well-known chain registry.
 *
 *   Info last verified Jan. 21 2025
 */

import { objectMap } from '@endo/patterns';
import cctpChainInfo from './cctp-chain-info.js';

/**
 * @import {CosmosChainInfo} from '@agoric/orchestration';
 */

/**
 * Chains with the async-icq (icq-1) module available.
 *
 * @satisfies {Record<string, boolean>}
 */
const IcqEnabled = /** @type {const} */ ({
  omniflixhub: true,
  osmosis: true,
});
harden(IcqEnabled);

/**
 * Chains with the packet-forward-middleware module available.
 *
 * @satisfies {Record<string, boolean>}
 */
const PfmEnabled = /** @type {const} */ ({
  agoric: true,
  celestia: true,
  cosmoshub: true,
  juno: true,
  neutron: true,
  noble: true,
  omniflixhub: true,
  osmosis: true,
  secretnetwork: true,
  stargaze: true,
  stride: true,
  umee: true,
});
harden(PfmEnabled);

/**
 * Chains with the interchain-accounts (ICS-27) module enabled as a host.
 *
 * @satisfies {Record<string, boolean>}
 */
const IcaEnabled = /** @type {const} */ ({
  celestia: true,
  cosmoshub: true,
  dydx: true,
  juno: true,
  neutron: true,
  noble: true,
  omniflixhub: true,
  osmosis: true,
  secretnetwork: true,
  stargaze: true,
  stride: true,
  umee: true,
});
harden(IcaEnabled);

/**
 * Adds chain capabilities to cosmos chains that are not currently indexed in
 * `@cosmos/chain-registry` but are necessary for `@agoric/orchestration`.
 *
 * @template {Record<string, CosmosChainInfo>} T
 * @param {T} chainInfo
 * @param {{
 *   PfmEnabled?: Record<string, boolean>;
 *   IcqEnabled?: Record<string, boolean>;
 *   IcaEnabled?: Record<string, boolean>;
 * }} [opts]
 * @returns {{
 *   [K in keyof T]: T[K] & {
 *     pfmEnabled: boolean;
 *     icqEnabled: boolean;
 *     icaEnabled: boolean;
 *     cctpDestinationDomain?: number;
 *   };
 * }}
 */
export const withChainCapabilities = (
  chainInfo,
  {
    PfmEnabled: pfmOpts = PfmEnabled,
    IcqEnabled: icqOpts = IcqEnabled,
    IcaEnabled: icaOpts = IcaEnabled,
  } = {},
) =>
  objectMap(chainInfo, (info, name) => {
    const chainName = /** @type {string} */ (name);
    const cctpDestinationDomain =
      cctpChainInfo?.[chainName]?.cctpDestinationDomain;

    return {
      ...info,
      pfmEnabled: !!pfmOpts[chainName],
      icqEnabled: !!icqOpts[chainName],
      icaEnabled: !!icaOpts[chainName],
      ...(cctpDestinationDomain && { cctpDestinationDomain }),
    };
  });
