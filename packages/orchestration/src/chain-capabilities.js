/**
 * @file Contains ChainInfo that not available from a well-known chain registry.
 *
 *   This is used to seed `agoricNames` and `ChainHub`. However, the data is
 *   dynamic and can change over time. (Remote chains can choose to add or
 *   remove ibc application modules with chain software upgrades and change
 *   allowlist settings.)
 *
 *   Developers should use `ChainHubAdmin` as part of their creator or governed
 *   facet if they wish to have fine-grained control over the data in their
 *   local `ChainHub`.
 *
 *   Last Updated October 29, 2024
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
