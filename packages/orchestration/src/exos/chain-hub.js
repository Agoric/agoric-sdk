import { BrandShape } from '@agoric/ertp/src/typeGuards.js';
import { Fail, makeError, q } from '@endo/errors';
import { E } from '@endo/far';
import { M } from '@endo/patterns';

import { VowShape } from '@agoric/vow';
import {
  AccountIdArgShape,
  ChainInfoShape,
  CoinShape,
  CosmosChainAddressShape,
  DenomAmountShape,
  DenomDetailShape,
  ForwardInfoShape,
  ForwardOptsShape,
  IBCChannelIDShape,
  IBCConnectionInfoShape,
} from '../typeGuards.js';
import { getBech32Prefix } from '../utils/address.js';
import { caipIdFromInfo } from '../utils/chain-info.js';

/**
 * @import {NameHub} from '@agoric/vats';
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {CosmosAssetInfo, CosmosChainInfo, ForwardInfo, IBCConnectionInfo, IBCMsgTransferOptions, TransferRoute, GoDuration, Bech32Address} from '../cosmos-api.js';
 * @import {KnownChains} from '../chain-info.js';
 * @import {AccountId, CosmosChainAddress, ChainInfo, CaipChainId, Denom, DenomAmount, AccountIdArg} from '../orchestration-api.js';
 * @import {Remote, TypedPattern} from '@agoric/internal';
 * @import {Pattern} from '@endo/patterns';
 */

/** receiver address value for ibc transfers that involve PFM */
export const PFM_RECEIVER = /** @type {const} */ ('pfm');

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
 * Character used in a connection tuple key to separate the two chain ids.
 */
const CHAIN_ID_SEPARATOR = '_';

/** @typedef {`${string}${CHAIN_ID_SEPARATOR}${string}`} IbcConnectionKey */

/**
 * Vstorage keys can be only alphanumerics, dash, or underscore, which are all
 * valid characters in chain IDs. So, double each occurence of
 * {@link CHAIN_ID_SEPARATOR} in the chain ID so the encoded tuple can be
 * decoded.
 *
 * @param {string} chainId
 * @see {@link https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md}
 */
export const encodeChainId = chainId =>
  chainId.replaceAll(
    CHAIN_ID_SEPARATOR,
    `${CHAIN_ID_SEPARATOR}${CHAIN_ID_SEPARATOR}`,
  );

/**
 * The entries of the top-level namehubs in agoricNames are reflected to
 * vstorage. But only the top level. So we combine the 2 chain ids into 1 key.
 * Connections are directionless, so we sort the ids.
 *
 * @param {string} chainId1
 * @param {string} chainId2
 * @returns {IbcConnectionKey}
 */
export const connectionKey = (chainId1, chainId2) => {
  const chainId1Sanitized = encodeChainId(chainId1);
  const chainId2Sanitized = encodeChainId(chainId2);

  return /** @type {IbcConnectionKey} */ (
    [chainId1Sanitized, chainId2Sanitized].sort().join(CHAIN_ID_SEPARATOR)
  );
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
 * @returns {[IbcConnectionKey, IBCConnectionInfo]}
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

// TODO #9324 determine timeout defaults
const DefaultPfmTimeoutOpts = harden(
  /** @type {const} */ ({
    retries: 3,
    timeout: /** @type {const} */ ('10m'),
  }),
);

/** @type {TypedPattern<TransferRoute>} */
export const TransferRouteShape = M.splitRecord(
  {
    sourcePort: M.string(),
    sourceChannel: IBCChannelIDShape,
    token: CoinShape,
    receiver: M.string(),
  },
  { forwardInfo: ForwardInfoShape },
  {},
);

const ChainHubI = M.interface('ChainHub', {
  registerChain: M.call(M.string(), ChainInfoShape).returns(),
  updateChain: M.call(M.string(), ChainInfoShape).returns(),
  getChainInfo: M.call(M.string()).returns(VowShape),
  getChainInfoByChainId: M.call(M.string()).returns(ChainInfoShape),
  registerConnection: M.call(
    M.string(),
    M.string(),
    IBCConnectionInfoShape,
  ).returns(),
  updateConnection: M.call(
    M.string(),
    M.string(),
    IBCConnectionInfoShape,
  ).returns(),
  getConnectionInfo: M.call(ChainIdArgShape, ChainIdArgShape).returns(VowShape),
  getChainsAndConnection: M.call(M.string(), M.string()).returns(VowShape),
  registerAsset: M.call(M.string(), DenomDetailShape).returns(),
  updateAsset: M.call(M.string(), DenomDetailShape).returns(),
  getAsset: M.call(M.string(), M.string()).returns(
    M.or(DenomDetailShape, M.undefined()),
  ),
  getDenom: M.call(BrandShape).returns(M.or(M.string(), M.undefined())),
  makeChainAddress: M.call(AccountIdArgShape).returns(CosmosChainAddressShape),
  resolveAccountId: M.call(AccountIdArgShape).returns(M.string()),
  makeTransferRoute: M.call(AccountIdArgShape, DenomAmountShape, M.string())
    .optional(ForwardOptsShape)
    .returns(M.or(M.undefined(), TransferRouteShape)),
});

/**
 * Make a new ChainHub in the zone.
 *
 * The resulting object is an Exo singleton. It has no precious state. Its only
 * state is a cache of queries to agoricNames and whatever info was provided in
 * registration calls. When you need a newer version you can simply make a hub
 * and repeat the registrations.
 *
 * @param {Zone} zone
 * @param {Remote<NameHub>} agoricNames
 * @param {VowTools} vowTools
 * @param {object} [opts]
 * @param {Pattern} [opts.chainInfoValueShape] legacy support for contracts
 *   deployed with `valueShape: CosmosChainInfoShape`. If nothing is supplied,
 *   defaults to {@link ChainInfoShape}
 */
export const makeChainHub = (
  zone,
  agoricNames,
  vowTools,
  { chainInfoValueShape = /** @type {Pattern} */ (ChainInfoShape) } = {},
) => {
  /**
   * Handle mapping of a chain's common name (e.g. 'ethereum' or "doravota") to
   * its info (e.g. specififying CAIP-2 eip155:1 or Cosmos chainId 'votash')
   *
   * @type {MapStore<string, ChainInfo>}
   */
  const chainInfos = zone.mapStore('chainInfos', {
    keyShape: M.string(),
    valueShape: chainInfoValueShape,
  });
  /**
   * IBC connection paths, keyed by a function of each chain's Cosmos chainId
   *
   * @type {MapStore<IbcConnectionKey, IBCConnectionInfo>}
   */
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
  /**
   * Handle mapping of, for example, "osmosis" chain that has bech32 prefix
   * "osmo" and chainId "osmosis-1".
   *
   * @type {MapStore<string, string>}
   */
  const bech32PrefixToChainName = zone.mapStore('bech32PrefixToChainName', {
    keyShape: M.string(),
    valueShape: M.string(),
  });
  /**
   * CaipChainId is implied by the ChainInfo. The value in this store is a key
   * into `chainInfos`.
   *
   * @type {MapStore<CaipChainId, string>}
   */
  const chainIdToChainName = zone.mapStore('chainIdToChainName', {
    keyShape: M.string(),
    valueShape: M.string(),
  });

  /**
   * @param {Denom} denom - from perspective of the src/holding chain
   * @param {DenomDetail['chainName']} srcChainName
   */
  const makeDenomKey = (denom, srcChainName) => `${srcChainName}:${denom}`;

  /**
   * @param {Bech32Address | string} address
   * @returns {string}
   */
  const resolveCosmosChainId = address => {
    // Infer it from the bech32 prefix
    const prefix = getBech32Prefix(address);
    if (!bech32PrefixToChainName.has(prefix)) {
      throw makeError(`Chain info not found for bech32Prefix ${q(prefix)}`);
    }
    const chainName = bech32PrefixToChainName.get(prefix);
    const { chainId } = /** @type {CosmosChainInfo} */ (
      chainInfos.get(chainName)
    );
    return chainId;
  };

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
          chainIdToChainName.init(caipIdFromInfo(chainInfo), chainName);
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
     *   [
     *     ActualChainInfo<C1>,
     *     ActualChainInfo<C2>,
     *     IBCConnectionInfo | undefined,
     *   ]
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

      const connectionInfo =
        primary.namespace === 'cosmos' && counter.namespace === 'cosmos'
          ? await vowTools.asPromise(
              chainHub.getConnectionInfo(primary, counter),
            )
          : undefined;
      return (
        /**
         * @type {[
         *   ActualChainInfo<C1>,
         *   ActualChainInfo<C2>,
         *   IBCConnectionInfo | undefined,
         * ]}
         */ ([primary, counter, connectionInfo])
      );
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
     * @param {ChainInfo} chainInfo
     */
    registerChain(name, chainInfo) {
      chainInfos.init(name, chainInfo);
      chainIdToChainName.init(caipIdFromInfo(chainInfo), name);
      if (chainInfo.namespace === 'cosmos' && chainInfo.bech32Prefix) {
        bech32PrefixToChainName.init(chainInfo.bech32Prefix, name);
      }
    },
    /**
     * Update chain info by completely replacing existing entry
     *
     * @param {string} chainName - Name of the chain to update
     * @param {ChainInfo} chainInfo - New chain info
     * @throws {Error} If chain not registered
     */
    updateChain(chainName, chainInfo) {
      if (!chainInfos.has(chainName)) {
        throw makeError(`Chain ${q(chainName)} not registered`);
      }
      const oldInfo = chainInfos.get(chainName);
      // defensively check, for older versions which may not have `chainIdToChainName`
      if (chainIdToChainName.has(caipIdFromInfo(oldInfo))) {
        chainIdToChainName.delete(caipIdFromInfo(oldInfo));
      }
      if (/** @type {CosmosChainInfo} */ (oldInfo).bech32Prefix) {
        bech32PrefixToChainName.delete(
          /** @type {CosmosChainInfo} */ (oldInfo).bech32Prefix,
        );
      }
      chainInfos.set(chainName, chainInfo);
      chainIdToChainName.init(caipIdFromInfo(chainInfo), chainName);
      if (/** @type {CosmosChainInfo} */ (chainInfo).bech32Prefix) {
        bech32PrefixToChainName.init(
          /** @type {CosmosChainInfo} */ (chainInfo).bech32Prefix,
          chainName,
        );
      }
    },
    /**
     * @template {string} K
     * @param {K} chainName
     * @returns {Vow<ActualChainInfo<K>>}
     */
    getChainInfo(chainName) {
      chainName.includes(':') &&
        Fail`${chainName} must be a bare chain name. Maybe try getChainInfoByChainId()`;
      // Either from registerChain or memoized remote lookup()
      if (chainInfos.has(chainName)) {
        return /** @type {Vow<ActualChainInfo<K>>} */ (
          vowTools.asVow(() =>
            // @ts-expect-error Type 'ChainInfo' is not assignable to type 'CosmosChainInfo | Vow<CosmosChainInfo> | PromiseVow<CosmosChainInfo>'.
            chainInfos.get(chainName),
          )
        );
      }

      return lookupChainInfo(chainName);
    },
    /**
     * @param {CaipChainId} chainId
     * @returns {ChainInfo}
     */
    getChainInfoByChainId(chainId) {
      // Either from registerChain or memoized remote lookup()
      chainIdToChainName.has(chainId) ||
        Fail`Chain name not found for ${q(chainId)}`;
      const chainName = chainIdToChainName.get(chainId);
      chainInfos.has(chainName) || Fail`Chain Info not found for ${q(chainId)}`;
      return chainInfos.get(chainName);
    },
    /**
     * Register information for a Cosmos chain
     *
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
     * Update connection info by completely replacing existing entry
     *
     * @param {string} primaryChainId - Cosmos chainId of primary chain
     * @param {string} counterpartyChainId - Cosmos chainId of counterparty
     *   chain
     * @param {IBCConnectionInfo} connectionInfo - New connection info
     * @throws {Error} If connection not registered
     */
    updateConnection(primaryChainId, counterpartyChainId, connectionInfo) {
      const key = connectionKey(primaryChainId, counterpartyChainId);
      if (!connectionInfos.has(key)) {
        throw makeError(
          `Connection ${q(primaryChainId)}<->${q(counterpartyChainId)} not registered`,
        );
      }
      const [_, normalizedInfo] = normalizeConnectionInfo(
        primaryChainId,
        counterpartyChainId,
        connectionInfo,
      );
      connectionInfos.set(key, normalizedInfo);
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

      const denomKey = makeDenomKey(denom, detail.chainName);
      denomDetails.has(denomKey) &&
        Fail`already registered ${q(denom)} on ${q(chainName)}`;
      denomDetails.init(denomKey, detail);
      if (detail.brand) {
        chainName === 'agoric' ||
          Fail`brands only registerable for agoric-held assets`;
        brandDenoms.init(detail.brand, denom);
      }
    },
    /**
     * Update asset info by completely replacing existing entry
     *
     * @param {Denom} denom - Denom on the holding chain
     * @param {DenomDetail} detail - New asset details
     * @throws {Error} If asset not registered or referenced chains not
     *   registered
     */
    updateAsset(denom, detail) {
      const { baseName, brand, chainName } = detail;
      const denomKey = makeDenomKey(denom, chainName);
      if (!denomDetails.has(denomKey)) {
        throw makeError(`Asset ${q(denom)} on ${q(chainName)} not registered`);
      }
      if (!chainInfos.has(chainName)) {
        throw makeError(`Chain ${q(chainName)} not registered`);
      }
      if (!chainInfos.has(baseName)) {
        throw makeError(`Chain ${q(baseName)} not registered`);
      }
      if (brand) {
        if (chainName !== 'agoric') {
          throw makeError('Brands only registerable for agoric-held assets');
        }
      }

      const oldDetail = denomDetails.get(denomKey);
      if (oldDetail.brand) {
        brandDenoms.delete(oldDetail.brand);
      }

      denomDetails.set(denomKey, detail);
      if (brand) {
        brandDenoms.init(brand, denom);
      }
    },
    /**
     * Retrieve holding, issuing chain names etc. for a denom.
     *
     * @param {Denom} denom
     * @param {string} srcChainName - the chainName the denom is held on
     * @returns {DenomDetail | undefined}
     */
    getAsset(denom, srcChainName) {
      const denomKey = makeDenomKey(denom, srcChainName);
      if (denomDetails.has(denomKey)) {
        return denomDetails.get(denomKey);
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
     * @param {AccountId | Bech32Address | string} partialId CAIP-10 account ID
     *   or a Cosmos bech32 address
     * @returns {AccountId}
     * @throws {Error} if chain info not found for bech32Prefix
     */
    resolveAccountId(partialId) {
      if (partialId.split(':').length === 3) {
        // if it's already a CAIP-10, return it.
        return /** @type {AccountId} */ (partialId);
      }

      const cosmosChainId = resolveCosmosChainId(
        /** @type {Bech32Address} */ (partialId),
      );
      return `cosmos:${cosmosChainId}:${partialId}`;
    },

    /**
     * @param {string} partialId CAIP-10 account ID or a Cosmos bech32 address
     * @returns {CosmosChainAddress}
     * @throws {Error} if chain info not found for bech32Prefix
     */
    makeChainAddress(partialId) {
      const parts = partialId.split(':');
      if (parts.length === 3) {
        assert.equal(parts[0], 'cosmos');
        return harden({
          chainId: parts[1],
          encoding: 'bech32',
          value: parts[2],
        });
      }

      const cosmosChainId = resolveCosmosChainId(
        /** @type {Bech32Address} */ (partialId),
      );
      return harden({
        chainId: cosmosChainId,
        value: partialId,
        encoding: /** @type {const} */ ('bech32'),
      });
    },

    /**
     * Determine the IBC transfer route for a destination and amount given the
     * current holding chain.
     *
     * Does not account for routes with more than 1 intermediary hop - that is,
     * it can't unwrap denoms that were incorrectly routed.
     *
     * XXX consider accepting AmountArg #10449
     *
     * @param {AccountIdArg | Bech32Address} destination
     * @param {DenomAmount} denomAmount
     * @param {string} srcChainName
     * @param {IBCMsgTransferOptions['forwardOpts']} [forwardOpts]
     * @returns {TransferRoute} single hop, multi hop
     * @throws {Error} if unable to determine route
     */
    makeTransferRoute(destination, denomAmount, srcChainName, forwardOpts) {
      chainInfos.has(srcChainName) ||
        Fail`chain info not found for holding chain: ${q(srcChainName)}`;

      const denomDetail = chainHub.getAsset(denomAmount.denom, srcChainName);
      denomDetail ||
        Fail`no denom detail for: ${q(denomAmount.denom)} on ${q(srcChainName)}. ensure it is registered in chainHub.`;

      const { baseName, chainName } = /** @type {DenomDetail} */ (denomDetail);

      // currently unreachable since assets are registered with holdingChainName
      chainName === srcChainName ||
        Fail`cannot transfer asset ${q(denomAmount.denom)}. held on ${q(chainName)} not ${q(srcChainName)}.`;

      // currently unreachable since we can't register an asset before a chain
      chainInfos.has(baseName) ||
        Fail`chain info not found for issuing chain: ${q(baseName)}`;

      const baseChainInfo = chainInfos.get(baseName);
      if (baseChainInfo.namespace !== 'cosmos')
        throw Fail`Only cosmos supported; got ${q(baseChainInfo.namespace)}`;
      const { chainId: baseChainId, pfmEnabled } = baseChainInfo;

      const holdingChainInfo = chainInfos.get(srcChainName);
      if (holdingChainInfo.namespace !== 'cosmos') {
        throw Fail`Only cosmos supported; got ${q(holdingChainInfo.namespace)}`;
      }
      const { chainId: holdingChainId } = holdingChainInfo;

      destination =
        typeof destination === 'string'
          ? chainHub.makeChainAddress(destination)
          : destination;

      // asset is transferring to or from the issuing chain, return direct route
      if (baseChainId === destination.chainId || baseName === srcChainName) {
        // TODO use getConnectionInfo once its sync
        const connKey = connectionKey(holdingChainId, destination.chainId);
        connectionInfos.has(connKey) ||
          Fail`no connection info found for ${holdingChainId}<->${destination.chainId}`;

        const { transferChannel } = denormalizeConnectionInfo(
          holdingChainId, // from chain (primary)
          destination.chainId, // to chain (counterparty)
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
      pfmEnabled || Fail`pfm not enabled on issuing chain: ${q(baseName)}`;

      // TODO use getConnectionInfo once its sync
      const currToIssuerKey = connectionKey(holdingChainId, baseChainId);
      connectionInfos.has(currToIssuerKey) ||
        Fail`no connection info found for ${holdingChainId}<->${baseChainId}`;

      const issuerToDestKey = connectionKey(baseChainId, destination.chainId);
      connectionInfos.has(issuerToDestKey) ||
        Fail`no connection info found for ${baseChainId}<->${destination.chainId}`;

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

      const { intermediateRecipient, ...rest } = forwardOpts ?? {};
      /** @type {ForwardInfo} */
      const forwardInfo = harden({
        forward: {
          receiver: destination.value,
          port: issuerToDest.transferChannel.portId,
          channel: issuerToDest.transferChannel.channelId,
          ...DefaultPfmTimeoutOpts,
          .../** @type {ForwardInfo} */ (rest), // timeout and retries
        },
      });
      return harden({
        sourcePort: currToIssuer.transferChannel.portId,
        sourceChannel: currToIssuer.transferChannel.channelId,
        token: {
          amount: String(denomAmount.value),
          denom: denomAmount.denom,
        },
        /**
         * purposely using invalid bech32
         * {@link https://github.com/cosmos/ibc-apps/blob/26f3ad8f58e4ffc7769c6766cb42b954181dc100/middleware/packet-forward-middleware/README.md#minimal-example---chain-forward-a-b-c}
         */
        receiver: intermediateRecipient?.value || PFM_RECEIVER,
        forwardInfo,
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
