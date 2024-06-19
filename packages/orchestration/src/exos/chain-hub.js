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
  getChainInfo: M.callWhen(M.string()).returns(CosmosChainInfoShape),
  registerConnection: M.callWhen(
    M.string(),
    M.string(),
    IBCConnectionInfoShape,
  ).returns(),
  getConnectionInfo: M.callWhen(ChainIdArgShape, ChainIdArgShape).returns(
    IBCConnectionInfoShape,
  ),
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
     * @returns {Promise<ActualChainInfo<K>>}
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
     * @param {string | { chainId: string }} chain1
     * @param {string | { chainId: string }} chain2
     * @returns {Promise<IBCConnectionInfo>}
     */
    async getConnectionInfo(chain1, chain2) {
      const chainId1 = typeof chain1 === 'string' ? chain1 : chain1.chainId;
      const chainId2 = typeof chain2 === 'string' ? chain2 : chain2.chainId;
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

  // FIXME updates redundantly, twice per edge
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

/**
 * @template {string} C1
 * @template {string} C2
 * @param {ChainHub} chainHub
 * @param {C1} chainName1
 * @param {C2} chainName2
 * @returns {Promise<
 *   [ActualChainInfo<C1>, ActualChainInfo<C2>, IBCConnectionInfo]
 * >}
 */
export const getChainsAndConnection = async (
  chainHub,
  chainName1,
  chainName2,
) => {
  const [chain1, chain2] = await Promise.all([
    chainHub.getChainInfo(chainName1),
    chainHub.getChainInfo(chainName2),
  ]);
  const connectionInfo = await chainHub.getConnectionInfo(chain2, chain1);

  return [chain1, chain2, connectionInfo];
};
