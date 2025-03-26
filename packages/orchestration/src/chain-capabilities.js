/**
 * @file Contains ChainInfo that not available from a well-known chain registry.
 *
 *   Info last verified Jan. 21 2025
 */

import { objectMap } from '@endo/patterns';
import cctpChainInfo from './cctp-chain-info.js';

/** @import {Chain, ChainInfo, KnownChains} from '@agoric/orchestration'; */

/**
 * Chains with the async-icq (icq-1) module available.
 *
 * @satisfies {Partial<Record<keyof KnownChains, boolean>>}
 */
const IcqEnabled = /** @type {const} */ ({
  omniflixhub: true,
  osmosis: true,
});
harden(IcqEnabled);

/**
 * Chains with the packet-forward-middleware module available.
 *
 * @satisfies {Partial<Record<keyof KnownChains, boolean>>}
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
 * @param {Record<string, ChainInfo>} chainInfo
 * @param {{
 *   PfmEnabled: Record<string, boolean>;
 *   IcqEnabled: Record<string, boolean>;
 *   IcaEnabled: Record<string, boolean>;
 * }} [opts]
 */
export const withChainCapabilities = (
  chainInfo,
  opts = {
    PfmEnabled,
    IcqEnabled,
    IcaEnabled,
  },
) => {
  return objectMap(chainInfo, (info, name) => ({
    ...info,
    ...(info.namespace === 'cosmos' && {
      pfmEnabled: !!opts.PfmEnabled[name],
      icqEnabled: !!opts.IcqEnabled[name],
      icaEnabled: !!opts.IcaEnabled[name],
      // effectively, merges fetched-chain-info.js and cctp-chain-info.js for `noble`
      ...(cctpChainInfo[name]?.cctpDestinationDomain && {
        cctpDestinationDomain: cctpChainInfo[name].cctpDestinationDomain,
      }),
    }),
  }));
};
