import { Fail, makeError, q } from '@endo/errors';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { BrandShape } from '@agoric/ertp/src/typeGuards.js';

import { VowShape } from '@agoric/vow';
import {
  ChainAddressShape,
  CosmosChainInfoShape,
  DenomAmountShape,
  DenomDetailShape,
  ForwardInfoShape,
  IBCConnectionInfoShape,
} from '../typeGuards.js';
import { getBech32Prefix } from '../utils/address.js';

/**
 * @import {NameHub} from '@agoric/vats';
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {CosmosAssetInfo, CosmosChainInfo, ForwardInfo, IBCConnectionInfo} from '../cosmos-api.js';
 * @import {ChainInfo, KnownChains} from '../chain-info.js';
 * @import {ChainAddress, Denom, DenomAmount} from '../orchestration-api.js';
 * @import {Remote} from '@agoric/internal';
 */

/**
 * If K matches a known chain, narrow the type from generic ChainInfo
 *
 * @template {string} K
 * @typedef {K extends keyof KnownChains
 *   ? ChainInfo & Omit<KnownChains[K], 'connections'>
 *   : ChainInfo} ActualChainInfo
 * @internal
 */

/**
 * @typedef {object} DenomDetail
 * @property {string} baseName - name of issuing chain; e.g. cosmoshub
 * @property {Denom} baseDenom - e.g. uatom
 * @property {string} chainName - name of holding chain; e.g. agoric
 * @property {Brand<'nat'>} [brand] - vbank brand, if registered
 * @see {ChainHub} `registerAsset` method
 */

/**
 * @enum {(typeof HubName)[keyof typeof HubName]}
 */
export const HubName = /** @type {const} */ ({
  /** agoricNames key for ChainInfo hub */
  Chain: 'chain',
  /** namehub for assets info */
  ChainAssets: 'chainAssets',
  /** namehub for connection info */
  ChainConnection: 'chainConnection',
});
harden(HubName);

/** @deprecated use HubName.Chain */
export const CHAIN_KEY = HubName.Chain;
/** @deprecated use HubName.ChainConnection */
export const CONNECTIONS_KEY = HubName.ChainConnection;
/** @deprecated use HubName.ChainAssets */
export const ASSETS_KEY = HubName.ChainAssets;

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
 * Utility to reverse connection info perspective.
 *
 * @param {IBCConnectionInfo} connInfo
 * @returns {IBCConnectionInfo}
 */
const reverseConnInfo = connInfo => {
  const { transferChannel } = connInfo;
  return harden({
    id: connInfo.counterparty.connection_id,
    client_id: connInfo.counterparty.client_id,
    counterparty: {
      client_id: connInfo.client_id,
      connection_id: connInfo.id,
    },
    state: connInfo.state,
    transferChannel: {
      ...transferChannel,
      channelId: transferChannel.counterPartyChannelId,
      counterPartyChannelId: transferChannel.channelId,
      portId: transferChannel.counterPartyPortId,
      counterPartyPortId: transferChannel.portId,
    },
  });
};

/**
 * Convert the info to an undirected form.
 *
 * @param {string} primaryChainId
 * @param {string} counterChainId
 * @param {IBCConnectionInfo} directed
 * @returns {[string, IBCConnectionInfo]}
 */
export const normalizeConnectionInfo = (
  primaryChainId,
  counterChainId,
  directed,
) => {
  const key = connectionKey(primaryChainId, counterChainId);
  if (primaryChainId < counterChainId) {
    return [key, directed];
  } else {
    return [key, reverseConnInfo(directed)];
  }
};

/**
 * Provide a view on the connection from the primary chain's perspective.
 *
 * @param {string} primaryChainId
 * @param {string} counterChainId
 * @param {IBCConnectionInfo} normalized
 */
const denormalizeConnectionInfo = (
  primaryChainId,
  counterChainId,
  normalized,
) => {
  if (primaryChainId < counterChainId) {
    return normalized;
  } else {
    return reverseConnInfo(normalized);
  }
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

// TODO #9324 determine defaults
const DefaultPfmTimeoutOpts = harden(
  /** @type {const} */ ({
    retries: 3,
    timeout: '10min',
  }),
);

const TransferRouteShape = M.splitRecord(
  {
    sourcePort: M.string(),
    sourceChannel: M.string(),
    token: {
      amount: M.string(),
      denom: M.string(),
    },
    receiver: M.string(),
  },
  { pfmMemo: M.or(M.undefined(), ForwardInfoShape) },
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
  registerAsset: M.call(M.string(), DenomDetailShape).returns(),
  getAsset: M.call(M.string()).returns(M.or(DenomDetailShape, M.undefined())),
  getDenom: M.call(BrandShape).returns(M.or(M.string(), M.undefined())),
  makeChainAddress: M.call(M.string()).returns(ChainAddressShape),
  getTransferRoute: M.call(ChainAddressShape, DenomAmountShape, M.string())
    .optional({
      timeout: M.string(),
      retries: M.number(),
    })
    .returns(M.or(M.undefined(), TransferRouteShape)),
});

/**
 * Make a new ChainHub in the zone.
 *
 * The resulting object is an Exo singleton. It has no precious state. It's only
 * state is a cache of queries to agoricNames and whatever info was provided in
 * registration calls. When you need a newer version you can simply make a hub
 * hub and repeat the registrations.
 *
 * @param {Zone} zone
 * @param {Remote<NameHub>} agoricNames
 * @param {VowTools} vowTools
 * @param {(...args: unknown[]) => void} [log] TODO - only for tests - should we
 *   update withOrchestration so we can observe these?
 */
export const makeChainHub = (zone, agoricNames, vowTools, log = () => {}) => {
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

  /** @type {MapStore<string, DenomDetail>} */
  const denomDetails = zone.mapStore('denom', {
    keyShape: M.string(),
    valueShape: DenomDetailShape,
  });
  /** @type {MapStore<Brand, string>} */
  const brandDenoms = zone.mapStore('brandDenom', {
    keyShape: BrandShape,
    valueShape: M.string(),
  });
  /** @type {MapStore<string, string>} */
  const bech32PrefixToChainName = zone.mapStore('bech32PrefixToChainName', {
    keyShape: M.string(),
    valueShape: M.string(),
  });

  const lookupChainInfo = vowTools.retryable(
    zone,
    'lookupChainInfo',
    /** @param {string} chainName */
    // eslint-disable-next-line no-restricted-syntax -- TODO more exact rules for vow best practices
    async chainName => {
      await null;
      try {
        const chainInfo = await E(agoricNames).lookup(HubName.Chain, chainName);
        // It may have been set by another concurrent call
        // TODO consider makeAtomicProvider for vows
        if (!chainInfos.has(chainName)) {
          chainInfos.init(chainName, chainInfo);
          if (chainInfo.bech32Prefix) {
            bech32PrefixToChainName.init(chainInfo.bech32Prefix, chainName);
          }
        }
        return chainInfo;
      } catch (e) {
        console.error('lookupChainInfo', chainName, 'error', e);
        throw makeError(`chain not found:${chainName}`);
      }
    },
  );

  const lookupConnectionInfo = vowTools.retryable(
    zone,
    'lookupConnectionInfo',
    /**
     * @param {string} chainId1
     * @param {string} chainId2
     */
    // eslint-disable-next-line no-restricted-syntax -- TODO more exact rules for vow best practices
    async (chainId1, chainId2) => {
      await null;
      const key = connectionKey(chainId1, chainId2);
      try {
        const connectionInfo = await E(agoricNames).lookup(
          HubName.ChainConnection,
          key,
        );
        // It may have been set by another concurrent call
        // TODO consider makeAtomicProvider for vows
        if (!connectionInfos.has(key)) {
          connectionInfos.init(key, connectionInfo);
        }

        return denormalizeConnectionInfo(chainId1, chainId2, connectionInfo);
      } catch (e) {
        console.error('lookupConnectionInfo', chainId1, chainId2, 'error', e);
        throw makeError(`connection not found: ${chainId1}<->${chainId2}`);
      }
    },
  );

  const lookupChainsAndConnection = vowTools.retryable(
    zone,
    'lookupChainsAndConnection',
    /**
     * @template {string} C1
     * @template {string} C2
     * @param {C1} primaryName
     * @param {C2} counterName
     * @returns {Promise<
     *   [ActualChainInfo<C1>, ActualChainInfo<C2>, IBCConnectionInfo]
     * >}
     */
    // eslint-disable-next-line no-restricted-syntax -- TODO more exact rules for vow best practices
    async (primaryName, counterName) => {
      const [primary, counter] = await vowTools.asPromise(
        vowTools.allVows([
          chainHub.getChainInfo(primaryName),
          chainHub.getChainInfo(counterName),
        ]),
      );
      const connectionInfo = await vowTools.asPromise(
        chainHub.getConnectionInfo(primary, counter),
      );
      return /** @type {[ActualChainInfo<C1>, ActualChainInfo<C2>, IBCConnectionInfo]} */ ([
        primary,
        counter,
        connectionInfo,
      ]);
    },
  );

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
      if (chainInfo.bech32Prefix) {
        bech32PrefixToChainName.init(chainInfo.bech32Prefix, name);
      }
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
          vowTools.asVow(() => chainInfos.get(chainName))
        );
      }

      return lookupChainInfo(chainName);
    },
    /**
     * @param {string} primaryChainId
     * @param {string} counterpartyChainId
     * @param {IBCConnectionInfo} connectionInfo from primary to counterparty
     */
    registerConnection(primaryChainId, counterpartyChainId, connectionInfo) {
      const [key, normalized] = normalizeConnectionInfo(
        primaryChainId,
        counterpartyChainId,
        connectionInfo,
      );
      connectionInfos.init(key, normalized);
    },

    /**
     * @param {string | { chainId: string }} primary the primary chain
     * @param {string | { chainId: string }} counter the counterparty chain
     * @returns {Vow<IBCConnectionInfo>}
     */
    getConnectionInfo(primary, counter) {
      const primaryId = typeof primary === 'string' ? primary : primary.chainId;
      const counterId = typeof counter === 'string' ? counter : counter.chainId;
      const key = connectionKey(primaryId, counterId);
      if (connectionInfos.has(key)) {
        return vowTools.asVow(() =>
          denormalizeConnectionInfo(
            primaryId,
            counterId,
            connectionInfos.get(key),
          ),
        );
      }

      return lookupConnectionInfo(primaryId, counterId);
    },

    /**
     * @template {string} C1
     * @template {string} C2
     * @param {C1} primaryName the primary chain name
     * @param {C2} counterName the counterparty chain name
     * @returns {Vow<
     *   [ActualChainInfo<C1>, ActualChainInfo<C2>, IBCConnectionInfo]
     * >}
     */
    getChainsAndConnection(primaryName, counterName) {
      // @ts-expect-error XXX generic parameter propagation
      return lookupChainsAndConnection(primaryName, counterName);
    },

    /**
     * Register an asset that may be held on a chain other than the issuing
     * chain.
     *
     * @param {Denom} denom - on the holding chain, whose name is given in
     *   `detail.chainName`
     * @param {DenomDetail} detail - chainName and baseName must be registered
     */
    registerAsset(denom, detail) {
      const { chainName, baseName } = detail;
      chainInfos.has(chainName) ||
        Fail`must register chain ${q(chainName)} first`;
      chainInfos.has(baseName) ||
        Fail`must register chain ${q(baseName)} first`;
      denomDetails.init(denom, detail);
      if (detail.brand) {
        brandDenoms.init(detail.brand, denom);
      }
    },
    /**
     * Retrieve holding, issuing chain names etc. for a denom.
     *
     * @param {Denom} denom
     * @returns {DenomDetail | undefined}
     */
    getAsset(denom) {
      if (denomDetails.has(denom)) {
        return denomDetails.get(denom);
      }
      return undefined;
    },
    /**
     * Retrieve denom (string) for a Brand.
     *
     * @param {Brand} brand
     * @returns {Denom | undefined}
     */
    getDenom(brand) {
      if (brandDenoms.has(brand)) {
        return brandDenoms.get(brand);
      }
      return undefined;
    },
    /**
     * @param {string} address bech32 address
     * @returns {ChainAddress}
     * @throws {Error} if chain info not found for bech32Prefix
     */
    makeChainAddress(address) {
      const prefix = getBech32Prefix(address);
      if (!bech32PrefixToChainName.has(prefix)) {
        throw makeError(`Chain info not found for bech32Prefix ${q(prefix)}`);
      }
      const chainName = bech32PrefixToChainName.get(prefix);
      const { chainId } = chainInfos.get(chainName);
      return harden({
        chainId,
        value: address,
        encoding: /** @type {const} */ ('bech32'),
      });
    },
    /**
     * @param {ChainAddress} destination
     * @param {DenomAmount} denomAmount
     * @param {string} holdingChainName
     * @param {Pick<ForwardInfo['forward'], 'retries' | 'timeout'>} [pfmOpts]
     */
    getTransferRoute(destination, denomAmount, holdingChainName, pfmOpts) {
      const denomDetail = chainHub.getAsset(denomAmount.denom);
      if (!chainInfos.has(holdingChainName)) {
        log(`chain info not found for holding chain: ${q(holdingChainName)}`);
        return undefined;
      }
      if (!denomDetail) {
        log(`no denom detail for: ${denomAmount.denom}`);
        return undefined;
      }
      const { baseName, chainName } = denomDetail;
      if (chainName !== holdingChainName) {
        log(
          `cannot transfer asset that's not present on ${q(holdingChainName)}. Ensure it's registered in ChainHub.`,
        );
        return undefined;
      }
      if (!chainInfos.has(baseName)) {
        log(`chain info not found for issuing chain: ${q(baseName)}`);
        return undefined;
      }
      const { chainId: baseChainId, pfmEnabled } = chainInfos.get(baseName);

      const holdingChainId = chainInfos.get(holdingChainName).chainId;

      // asset is transferring to or from the issuing chain, return direct route
      if (
        baseChainId === destination.chainId &&
        baseName === holdingChainName
      ) {
        // manually look up connection info from mapStore so calls are sync
        const connKey = connectionKey(baseChainId, holdingChainId);
        if (!connectionInfos.has(connKey)) {
          log(`no connection info found for ${q(connKey)}`);
          return undefined;
        }
        const { transferChannel } = denormalizeConnectionInfo(
          baseChainId,
          holdingChainId,
          connectionInfos.get(connKey),
        );
        return harden({
          sourcePort: transferChannel.portId,
          sourceChannel: transferChannel.channelId,
          token: {
            amount: String(denomAmount.value),
            denom: denomAmount.denom,
          },
          receiver: destination.value,
        });
      }

      // asset is issued on a 3rd chain, attempt pfm route
      if (!pfmEnabled) {
        log(`pfm not enabled on issuing chain: ${q(baseName)}`);
        return undefined;
      }

      // manually look up connection info from mapStore so calls are sync
      const currToIssuerKey = connectionKey(holdingChainId, baseChainId);
      if (!connectionInfos.has(currToIssuerKey)) {
        log(`no connection info found for ${q(currToIssuerKey)}`);
        return undefined;
      }
      const issuerToDestKey = connectionKey(baseChainId, destination.chainId);
      if (!connectionInfos.has(issuerToDestKey)) {
        log(`no connection info found for ${q(issuerToDestKey)}`);
        return undefined;
      }

      const currToIssuer = denormalizeConnectionInfo(
        holdingChainId,
        baseChainId,
        connectionInfos.get(currToIssuerKey),
      );
      const issuerToDest = denormalizeConnectionInfo(
        baseChainId,
        destination.chainId,
        connectionInfos.get(issuerToDestKey),
      );

      /** @type {ForwardInfo} */
      const pfmMemo = harden({
        forward: {
          receiver: destination.value,
          port: issuerToDest.transferChannel.portId,
          channel: issuerToDest.transferChannel.channelId,
          ...{
            ...DefaultPfmTimeoutOpts,
            ...pfmOpts,
          },
        },
      });
      return harden({
        sourcePort: currToIssuer.transferChannel.portId,
        sourceChannel: currToIssuer.transferChannel.channelId,
        token: {
          amount: String(denomAmount.value),
          denom: denomAmount.denom,
        },
        receiver: 'pfm',
        pfmMemo,
      });
    },
  });

  return chainHub;
};
/** @typedef {ReturnType<typeof makeChainHub>} ChainHub */

/**
 * Register assets with the given ChainHub so they are available for lookup
 *
 * @param {ChainHub} chainHub
 * @param {string} name
 * @param {CosmosAssetInfo[]} assets
 */
export const registerAssets = (chainHub, name, assets) => {
  for (const { base, traces } of assets) {
    const native = !traces;
    native || traces.length === 1 || Fail`unexpected ${traces.length} traces`;
    const [chainName, baseName, baseDenom] = native
      ? [name, name, base]
      : [
          name,
          traces[0].counterparty.chain_name,
          traces[0].counterparty.base_denom,
        ];
    chainHub.registerAsset(base, { chainName, baseName, baseDenom });
  }
};
