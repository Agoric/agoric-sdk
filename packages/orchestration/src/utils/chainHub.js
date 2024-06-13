import { E } from '@endo/far';
import { M, mustMatch } from '@endo/patterns';
import { makeHeapZone } from '@agoric/zone';
import { CosmosChainInfoShape, IBCConnectionInfoShape } from '../typeGuards.js';

const { Fail } = assert;

/**
 * @import {NameHub} from '@agoric/vats';
 * @import {CosmosChainInfo, IBCConnectionInfo} from '../cosmos-api.js';
 * @import {ChainInfo, KnownChains} from '../chain-info.js';
 * @import {Remote} from '@agoric/internal';
 * @import {Zone} from '@agoric/zone';
 */

/** agoricNames key for ChainInfo hub */
export const CHAIN_KEY = 'chain';
/** namehub for connection info */
export const CONNECTIONS_KEY = 'chainConnection';

/**
 * Character used in a connection tuple key to separate the two chain ids. Valid
 * because a chainId can contain only alphanumerics and dash.
 *
 * Vstorage keys can be only alphanumerics, dash or underscore. That leaves
 * underscore as the only valid separator.
 *
 * @see {@link https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md}
 */
const CHAIN_ID_SEPARATOR = '_';

/**
 * The entries of the top-level namehubs in agoricNames are reflected to
 * vstorage. But only the top level. So we combine the 2 chain ids into 1 key.
 * Connections are directionless, so we sort the ids.
 *
 * @param {string} chainId1
 * @param {string} chainId2
 */
export const connectionKey = (chainId1, chainId2) => {
  if (
    chainId1.includes(CHAIN_ID_SEPARATOR) ||
    chainId2.includes(CHAIN_ID_SEPARATOR)
  ) {
    Fail`invalid chain id ${chainId1} or ${chainId2}`;
  }
  return [chainId1, chainId2].sort().join(CHAIN_ID_SEPARATOR);
};

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
     * @template {string} K
     * @param {K} chainName
     * @returns {Promise<
     *   K extends keyof KnownChains
     *     ? Omit<KnownChains[K], 'connections'>
     *     : ChainInfo
     * >}
     */
    async getChainInfo(chainName) {
      // Either from registerChain or memoized remote lookup()
      if (chainInfos.has(chainName)) {
        // @ts-expect-error cast
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
     * @param {string} chainId1
     * @param {string} chainId2
     * @param {IBCConnectionInfo} connectionInfo
     */
    registerConnection(chainId1, chainId2, connectionInfo) {
      const key = connectionKey(chainId1, chainId2);
      connectionInfos.init(key, connectionInfo);
    },

    /**
     * @param {string} chainId1
     * @param {string} chainId2
     * @returns {Promise<IBCConnectionInfo>}
     */
    async getConnectionInfo(chainId1, chainId2) {
      const key = connectionKey(chainId1, chainId2);
      if (connectionInfos.has(key)) {
        return connectionInfos.get(key);
      }

      const connectionInfo = await E(agoricNames)
        .lookup(CONNECTIONS_KEY, key)
        .catch(_cause => {
          throw assert.error(`connection not found: ${chainId1}<->${chainId2}`);
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
 * @param {(...messages: string[]) => void} log
 */
export const registerChain = async (
  agoricNamesAdmin,
  name,
  chainInfo,
  log = () => {},
) => {
  const { nameAdmin } = await E(agoricNamesAdmin).provideChild('chain');
  const { nameAdmin: connAdmin } =
    await E(agoricNamesAdmin).provideChild('chainConnection');

  mustMatch(chainInfo, CosmosChainInfoShape);
  const { connections = {}, ...vertex } = chainInfo;

  const promises = [
    E(nameAdmin)
      .update(name, vertex)
      .then(() => log(`registered agoricNames chain.${name}`)),
  ];

  // XXX updates redundantly, twice per edge
  for await (const [counterChainId, connInfo] of Object.entries(connections)) {
    const key = connectionKey(chainInfo.chainId, counterChainId);
    promises.push(
      E(connAdmin)
        .update(key, connInfo)
        .then(() => log(`registering agoricNames chainConnection.${key}`)),
    );
  }
  // Bundle to pipeline IO
  await Promise.all(promises);
};
