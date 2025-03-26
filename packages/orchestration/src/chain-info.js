/**
 * @file Info used to build a {@link ChainHub} and return chainInfo from the
 *   {@link Orchestrator} via the {@link Chain} object.
 *
 *   Includes {@link BaseChainInfo} and {@link CosmosChainInfo}
 */

import { E } from '@endo/far';
import { M, mustMatch } from '@endo/patterns';
import { HubName, normalizeConnectionInfo } from './exos/chain-hub.js';
import fetchedChainInfo from './fetched-chain-info.js'; // Refresh with scripts/refresh-chain-info.ts
import { CosmosAssetInfoShape, CosmosChainInfoShape } from './typeGuards.js';
import { withChainCapabilities } from './chain-capabilities.js';

/**
 * @import {CosmosAssetInfo, CosmosChainInfo} from './types.js';
 * @import {NameAdmin} from '@agoric/vats';
 * @import {ChainInfo} from './orchestration-api.ts';
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

const knownChains = /** @satisfies {Record<string, ChainInfo>} */ (
  harden(fetchedChainInfo)
);

/**
 * @typedef {typeof knownChains} KnownChains
 * @internal
 */

// TODO(#9966, #9967): include this in registerChain
/**
 * Register chain assets into agoricNames
 *
 * @param {ERef<NameAdmin>} agoricNamesAdmin
 * @param {string} name
 * @param {CosmosAssetInfo[]} assets
 * @alpha
 */
export const registerChainAssets = async (agoricNamesAdmin, name, assets) => {
  mustMatch(assets, M.arrayOf(CosmosAssetInfoShape));
  const { nameAdmin: assetAdmin } = await E(agoricNamesAdmin).provideChild(
    HubName.ChainAssets,
  );
  return E(assetAdmin).update(name, assets);
};

/**
 * Register a chain into agoricNames
 *
 * @param {ERef<NameAdmin>} agoricNamesAdmin
 * @param {string} name
 * @param {CosmosChainInfo} chainInfo
 * @param {(...messages: string[]) => void} [log]
 * @param {Set<string>} [handledConnections] connection keys that need not be
 *   updated
 */
export const registerChain = async (
  agoricNamesAdmin,
  name,
  chainInfo,
  log = () => {},
  handledConnections = new Set(),
) => {
  const { nameAdmin } = await E(agoricNamesAdmin).provideChild(HubName.Chain);
  const { nameAdmin: connAdmin } = await E(agoricNamesAdmin).provideChild(
    HubName.ChainConnection,
  );

  mustMatch(chainInfo, CosmosChainInfoShape);
  const { connections = {}, ...vertex } = chainInfo;

  const promises = [
    E(nameAdmin)
      .update(name, vertex)
      .then(() => log(`registered agoricNames chain.${name}`)),
  ];

  const { chainId } = chainInfo;
  for (const [counterChainId, connInfo] of Object.entries(connections)) {
    const [key, connectionInfo] = normalizeConnectionInfo(
      chainId,
      counterChainId,
      connInfo,
    );
    if (handledConnections.has(key)) {
      continue;
    }

    promises.push(
      E(connAdmin)
        .update(key, connectionInfo)
        .then(() => log(`registering agoricNames chainConnection.${key}`)),
    );

    handledConnections.add(key);
  }
  // Bundle to pipeline IO
  await Promise.all(promises);
};

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
  for await (const [name, info] of Object.entries(
    withChainCapabilities(knownChains),
  )) {
    await registerChain(agoricNamesAdmin, name, info, log, handledConnections);
  }
};
