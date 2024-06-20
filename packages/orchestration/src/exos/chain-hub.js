import { VowShape } from '@agoric/vow';
import { allVows, watch } from '@agoric/vow/vat.js';
import { makeHeapZone } from '@agoric/zone';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { CosmosChainInfoShape, IBCConnectionInfoShape } from '../typeGuards.js';

const { Fail } = assert;

/**
 * @import {NameHub} from '@agoric/vats';
 * @import {Vow} from '@agoric/vow';
 * @import {CosmosChainInfo, IBCConnectionInfo} from '../cosmos-api.js';
 * @import {ChainInfo, KnownChains} from '../chain-info.js';
 * @import {Remote} from '@agoric/internal';
 * @import {Zone} from '@agoric/zone';
 */

/**
 * @template {string} K
 * @typedef {K extends keyof KnownChains
 *   ? Omit<KnownChains[K], 'connections'>
 *   : ChainInfo} ActualChainInfo
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

const ChainIdArgShape = M.or(
  M.string(),
  M.splitRecord(
    {
      chainId: M.string(),
    },
    undefined,
    M.any(),
  ),
);

const ChainHubI = M.interface('ChainHub', {
  registerChain: M.call(M.string(), CosmosChainInfoShape).returns(),
  getChainInfo: M.call(M.string()).returns(VowShape),
  registerConnection: M.call(
    M.string(),
    M.string(),
    IBCConnectionInfoShape,
  ).returns(),
  getConnectionInfo: M.call(ChainIdArgShape, ChainIdArgShape).returns(VowShape),
  getChainsAndConnection: M.call(M.string(), M.string()).returns(VowShape),
});

/**
 * Make a new ChainHub in the zone (or in the heap if no zone is provided).
 *
 * The resulting object is an Exo singleton. It has no precious state. It's only
 * state is a cache of queries to agoricNames and whatever info was provided in
 * registration calls. When you need a newer version you can simply make a hub
 * hub and repeat the registrations.
 *
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

  const chainHub = zone.exo('ChainHub', ChainHubI, {
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
     * @returns {Vow<ActualChainInfo<K>>}
     */
    getChainInfo(chainName) {
      // Either from registerChain or memoized remote lookup()
      if (chainInfos.has(chainName)) {
        return /** @type {Vow<ActualChainInfo<K>>} */ (
          watch(chainInfos.get(chainName))
        );
      }

      return watch(E(agoricNames).lookup(CHAIN_KEY, chainName), {
        onFulfilled: chainInfo => {
          chainInfos.init(chainName, chainInfo);
          return chainInfo;
        },
        onRejected: _cause => {
          throw assert.error(`chain not found:${chainName}`);
        },
      });
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
     * @param {string | { chainId: string }} chain1
     * @param {string | { chainId: string }} chain2
     * @returns {Vow<IBCConnectionInfo>}
     */
    getConnectionInfo(chain1, chain2) {
      const chainId1 = typeof chain1 === 'string' ? chain1 : chain1.chainId;
      const chainId2 = typeof chain2 === 'string' ? chain2 : chain2.chainId;
      const key = connectionKey(chainId1, chainId2);
      if (connectionInfos.has(key)) {
        return watch(connectionInfos.get(key));
      }

      return watch(E(agoricNames).lookup(CONNECTIONS_KEY, key), {
        onFulfilled: connectionInfo => {
          connectionInfos.init(key, connectionInfo);
          return connectionInfo;
        },
        onRejected: _cause => {
          throw assert.error(`connection not found: ${chainId1}<->${chainId2}`);
        },
      });
    },

    /**
     * @template {string} C1
     * @template {string} C2
     * @param {C1} chainName1
     * @param {C2} chainName2
     * @returns {Vow<
     *   [ActualChainInfo<C1>, ActualChainInfo<C2>, IBCConnectionInfo]
     * >}
     */
    getChainsAndConnection(chainName1, chainName2) {
      return watch(
        allVows([
          chainHub.getChainInfo(chainName1),
          chainHub.getChainInfo(chainName2),
        ]),
        {
          onFulfilled: ([chain1, chain2]) => {
            return watch(chainHub.getConnectionInfo(chain2, chain1), {
              onFulfilled: connectionInfo => {
                return [chain1, chain2, connectionInfo];
              },
            });
          },
        },
      );
    },
  });

  return chainHub;
};
/** @typedef {ReturnType<typeof makeChainHub>} ChainHub */
