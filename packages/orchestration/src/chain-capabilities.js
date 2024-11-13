/**
 * @file Contains ChainInfo that not available from a well-known chain registry.
 */

/** @import {KnownChains} from '@agoric/orchestration'; */

/**
 * Chains with the async-icq (icq-1) module available.
 *
 * @satisfies {(keyof KnownChains)[]}
 */
export const ICQ_ENABLED = /** @type {const} } */ ['omniflixhub', 'osmosis'];
harden(ICQ_ENABLED);

/**
 * Chains with the packet-forward-middleware module available.
 *
 * @satisfies {(keyof KnownChains)[]}
 */
export const PFM_ENABLED = /** @type {const} } */ [
  'agoric',
  'celestia',
  'cosmoshub',
  'juno',
  'neutron',
  'noble',
  'omniflixhub',
  'osmosis',
  'secretnetwork',
  'stargaze',
  'stride',
  'umee',
];
harden(PFM_ENABLED);
