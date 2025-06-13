/**
 * @file Info used to build a {@link ChainHub} and return chainInfo from the
 *   {@link Orchestrator} via the {@link Chain} object.
 *
 *   Includes {@link BaseChainInfo} and {@link CosmosChainInfo}
 */

import fetchedChainInfo from './fetched-chain-info.js'; // Refresh with scripts/refresh-chain-info.ts
import cctpChainInfo from './cctp-chain-info.js';
import { withChainCapabilities } from './chain-capabilities.js';
import { registerChain } from './chain-name-service.js';

/**
 * @import {CosmosAssetInfo, CosmosChainInfo, IBCConnectionInfo} from './types.js';
 * @import {NameAdmin} from '@agoric/vats';
 * @import {ChainInfo} from './orchestration-api.js';
 */

/**
 * Well-known namespaces supported by the Orchestration SDK
 *
 * @enum {(typeof KnownNamespace)[keyof typeof KnownNamespace]}
 * @see {@link https://github.com/ChainAgnostic/CAIPs/blob/c599f7601d0ce83e6dd9f350c6c21d158d56fd6d/CAIPs/caip-2.md}
 */
export const KnownNamespace = /** @type {const} */ ({
  cosmos: 'cosmos',
  eip155: 'eip155',
  solana: 'solana',
});
harden(KnownNamespace);

const { noble: _n, ...restCctpChainInfo } = cctpChainInfo;
const knownChains = /** @satisfies {Record<string, ChainInfo>} */ (
  harden({ ...withChainCapabilities(fetchedChainInfo), ...restCctpChainInfo })
);

/**
 * @typedef {typeof knownChains} KnownChains
 * @internal
 */

/**
 * Register all the chains that are known statically in `agoricNames`.
 *
 * Not active on or planned for mainnet.
 *
 * @param {ERef<import('@agoric/vats').NameHubKit['nameAdmin']>} agoricNamesAdmin
 * @param {(...messages: string[]) => void} [log]
 */
export const registerKnownChains = async (agoricNamesAdmin, log) => {
  const handledConnections = new Set();
  for await (const [name, info] of Object.entries(knownChains)) {
    await registerChain(agoricNamesAdmin, name, info, log, handledConnections);
  }
};
