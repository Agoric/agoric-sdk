import { E } from '@endo/eventual-send';
import { M, mustMatch } from '@endo/patterns';
import { HubName } from './constants.js';
import { normalizeConnectionInfo } from './exos/chain-hub.js';
import { ChainInfoShape, CosmosAssetInfoShape } from './typeGuards.js';

/**
 * @import {CosmosAssetInfo, IBCConnectionInfo} from './types.js';
 * @import {NameAdmin} from '@agoric/vats';
 * @import {ChainInfo} from './orchestration-api.ts';
 */

/**
 * Register a chain into agoricNames
 *
 * @param {ERef<NameAdmin>} agoricNamesAdmin
 * @param {string} name
 * @param {ChainInfo} chainInfo
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

  mustMatch(chainInfo, ChainInfoShape);

  /** @type {Record<string, IBCConnectionInfo>} */
  const connections = /** @type {any} */ (chainInfo).connections || {};
  const { connections: _, ...vertex } = /** @type {any} */ (chainInfo);

  const promises = [
    E(nameAdmin)
      .update(name, vertex)
      .then(() => log(`registered agoricNames chain.${name}`)),
  ];

  const { chainId } = /** @type {import('./types.js').CosmosChainInfo} */ (
    chainInfo
  );
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
