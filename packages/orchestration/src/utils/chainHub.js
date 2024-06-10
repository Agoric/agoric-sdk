import { E } from '@endo/far';
import { M, mustMatch } from '@endo/patterns';
import { makeHeapZone } from '@agoric/zone';
import { CosmosChainInfoShape, IBCConnectionInfoShape } from '../typeGuards.js';

/**
 * @import {NameHub} from '@agoric/vats';
 * @import {CosmosChainInfo, IBCConnectionInfo} from '../cosmos-api.js';
 * @import {Remote} from '@agoric/internal';
 * @import {Zone} from '@agoric/zone';
 */

/** agoricNames key for ChainInfo hub */
export const CHAIN_KEY = 'chain';
/** namehub for connection info */
export const CONNECTIONS_KEY = 'chainConnection';

/**
 * The entries of the top-level namehubs in agoricNames are reflected to
 * vstorage. But only the top level. So we combine the 2 chain ids into 1 key.
 * Connections are directionless, so we sort the ids.
 *
 * @param {string} chainId1
 * @param {string} chainId2
 */
export const connectionKey = (chainId1, chainId2) =>
  JSON.stringify([chainId1, chainId2].sort());

/**
 * @param {Remote<NameHub>} agoricNames
 * @param {Zone} [zone]
 */
export const makeChainHub = (agoricNames, zone = makeHeapZone()) => {
  /** @type {MapStore<string, CosmosChainInfo>} */
  const chainInfos = zone.mapStore('chainInfos', {
    keyShape: M.string(),
    valueShape: CosmosChainInfoShape,
  });
  /** @type {MapStore<string, IBCConnectionInfo>} */
  const connectionInfos = zone.mapStore('connectionInfos', {
    keyShape: M.string(),
    valueShape: IBCConnectionInfoShape,
  });

  const chainHub = harden({
    /**
     * Register a new chain. The name will override a name in well known chain
     * names.
     *
     * If a durable zone was not provided, registration will not survive a
     * reincarnation of the vat. Then if the chain is not yet in the well known
     * names at that point, it will have to be registered again. In an unchanged
     * contract `start` the call will happen again naturally.
     *
     * @param {string} name
     * @param {CosmosChainInfo} chainInfo
     */
    registerChain(name, chainInfo) {
      chainInfos.init(name, chainInfo);
    },
    /**
     * @param {string} chainName
     * @returns {Promise<CosmosChainInfo>}
     */
    async getChainInfo(chainName) {
      // Either from registerChain or memoized remote lookup()
      if (chainInfos.has(chainName)) {
        return chainInfos.get(chainName);
      }

      const chainInfo = await E(agoricNames)
        .lookup(CHAIN_KEY, chainName)
        .catch(_cause => {
          throw assert.error(`chain not found:${chainName}`);
        });
      chainInfos.init(chainName, chainInfo);
      return chainInfo;
    },
    /**
     * @param {string} srcChainId
     * @param {string} destChainId
     * @param {IBCConnectionInfo} connectionInfo
     */
    registerConnection(srcChainId, destChainId, connectionInfo) {
      const key = connectionKey(srcChainId, destChainId);
      connectionInfos.init(key, connectionInfo);
    },

    /**
     * @param {string} srcChainId
     * @param {string} destChainId
     * @returns {Promise<IBCConnectionInfo>}
     */
    async getConnectionInfo(srcChainId, destChainId) {
      const key = connectionKey(srcChainId, destChainId);
      if (connectionInfos.has(key)) {
        return connectionInfos.get(key);
      }

      const connectionInfo = await E(agoricNames)
        .lookup(CONNECTIONS_KEY, key)
        .catch(_cause => {
          throw assert.error(
            `connection not found: ${srcChainId}<->${destChainId}`,
          );
        });
      connectionInfos.init(key, connectionInfo);
      return connectionInfo;
    },
  });

  return chainHub;
};
/** @typedef {ReturnType<typeof makeChainHub>} ChainHub */

/**
 * @param {ERef<import('@agoric/vats').NameHubKit['nameAdmin']>} agoricNamesAdmin
 * @param {string} name
 * @param {CosmosChainInfo} chainInfo
 */
export const registerChain = async (agoricNamesAdmin, name, chainInfo) => {
  const { nameAdmin } = await E(agoricNamesAdmin).provideChild('chain');
  const { nameAdmin: connAdmin } =
    await E(agoricNamesAdmin).provideChild('chainConnection');

  mustMatch(chainInfo, CosmosChainInfoShape);
  // XXX chainInfo.connections is redundant here.
  await E(nameAdmin).update(name, chainInfo);

  for await (const [destChainId, connInfo] of Object.entries(
    chainInfo.connections,
  )) {
    const key = connectionKey(chainInfo.chainId, destChainId);
    await E(connAdmin).update(key, connInfo);
  }
};
