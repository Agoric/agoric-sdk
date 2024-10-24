/**
 * @file Contains ChainInfo that not available from a well-known chain registry.
 *
 *   This is used to seed `agoricNames` and `ChainHub`. However, it is dynamic and
 *   can change over time.
 *
 *   Developers should use the `ChainHubAdmin` if they wish to have fine-grained
 *   control over the data in their local `ChainHub`.
 *
 *   Last Updated October 22, 2024
 */

/** @import {KnownChains} from '@agoric/orchestration'; */

/**
 * Chains with the async-icq (icq-1) module available.
 *
 * @satisfies {(keyof KnownChains)[]}
 */
export const ICQ_ENABLED = ['omniflixhub', 'osmosis'];

/**
 * Chains with the packet-forward-middleware module available.
 *
 * @satisfies {(keyof KnownChains)[]}
 */
export const PFM_ENABLED = [
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
