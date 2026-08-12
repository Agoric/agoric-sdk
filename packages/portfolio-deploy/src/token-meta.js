/* globals globalThis */
import { partialMap, typedEntries } from '@agoric/internal';
import {
  CaipChainIds,
  UsdcTokenIds,
} from '@agoric/portfolio-api/src/constants.js';
import { makeTokenIdKey } from '@agoric/portfolio-api/src/places.js';
import { objectMap } from '@endo/patterns';

/**
 * @import { ChainTokenMetadata, TokenMetadata, SupportedChain } from '@agoric/portfolio-api';
 * @import { CaipChainId } from '@agoric/orchestration';
 * @import { ClusterName } from '@agoric/internal';
 * @import {PortfolioDeployConfig} from './portfolio-start.core.js';
 */

/**
 * @typedef {`@${SupportedChain}` | `${string}_${SupportedChain}` | 'USDN'} WellKnownInstrumentIds
 */
/**
 * @typedef {'USDC' | 'USDN'} WellKnownStableCoinSymbols
 */

/**
 * Legacy parsing of /instruments
 * @typedef {{
 *   data: {
 *     id: WellKnownInstrumentIds;
 *     caipChainId: CaipChainId;
 *     protocol: {
 *       name: string,
 *       id: Lowercase<string>; // slug
 *     };
 *     asset: {
 *       symbol: WellKnownStableCoinSymbols;
 *     };
 *    }[];
 * }} YdsInstruments
 */

/**
 * Legacy parsing of /reward-token-rates
 * @typedef {{
 *   data: {
 *     evmChainId: number;
 *     sourceToken: `0x${string}`; // tokenId
 *     sourceDenom: Uppercase<string>; // MORPHO
 *     targetToken: `0x${string}`; // tokenId
 *     targetDenom: Uppercase<string>; // USDC
 *   }[];
 * }} YdsRewardTokenRates
 */

/**
 * @template {bigint | number | string} T
 * @param {T} a
 * @param {T} b
 * @returns {-1 | 0 | 1}
 */
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * @template V
 * @template {PropertyKey} [P=PropertyKey]
 * @param {Record<P, V>} record
 * @param {P} prop
 * @param {(prop: P, record: Record<P, V>) => V} initFn
 * @returns {V}
 */
const provideLazyRecord = (record, prop, initFn) => {
  if (Object.hasOwn(record, prop)) {
    return record[prop];
  }
  const value = initFn(prop, record);
  Object.defineProperty(record, prop, {
    writable: true,
    enumerable: true,
    configurable: true,
    value,
  });
  return value;
};

/** @type {(strings: string[]) => string} */
const keyFromStrings = strings => JSON.stringify(strings);

/**
 * @template {(str1: string, str2: string) => unknown} F
 * @param {F} fn
 * @returns {F}
 */
const memoize2Strings = fn => {
  /** @type {Map<string, unknown>} */
  const memo = new Map();
  const wrapper = (str1, str2) => {
    const key = keyFromStrings([str1, str2]);
    if (memo.has(key)) {
      return memo.get(key);
    }
    const val = fn(str1, str2);
    memo.set(key, val);
    return val;
  };
  return /** @type {F} */ (wrapper);
};

/**
 * @template T
 * @param {typeof globalThis.fetch} fetchFn
 * @param {string | URL} url
 * @returns {Promise<T>}
 */
const fetchJson = async (fetchFn, url) => {
  const response = await fetchFn(String(url));
  if (!response.ok) {
    throw Error(`failed to fetch from ${url}: ${response.status}`);
  }
  return response.json();
};

/**
 * @param {ClusterName} cluster
 * @returns {ChainTokenMetadata}
 */
export const getDefaultChainTokenMetadata = cluster => {
  const caipChainIdForName = CaipChainIds[cluster];
  const usdcTokenIdForName = UsdcTokenIds[cluster];

  /** @type {ChainTokenMetadata} */
  const chainMetadata = {};
  for (const chainName of Object.keys(caipChainIdForName)) {
    const caipChainId = caipChainIdForName?.[chainName];
    if (!caipChainId) continue;

    /**
     * Here is where we would add other stablecoins.
     *
     * @type {Record<string, TokenMetadata>}
     */
    const tokenMetadataById = {};

    const usdcTokenId = usdcTokenIdForName?.[chainName];
    if (usdcTokenId) {
      const token = /** @type {const} */ ({
        chainName,
        caipChainId,
        symbol: 'USDC',
        tokenId: usdcTokenId,
        // Current conventional decimals.  We can always override.
        decimals: 6,
        usage: ['swapTo'],
      });
      tokenMetadataById[makeTokenIdKey(usdcTokenId)] = token;
    }

    chainMetadata[chainName] = {
      caipChainId,
      chainName,
      tokenMetadataById,
    };
  }
  return harden(chainMetadata);
};
harden(getDefaultChainTokenMetadata);

/**
 * @param {TokenMetadata[]} tms
 * @returns {ChainTokenMetadata}
 */
export const collateTokenMetadata = tms => {
  /** @type {ChainTokenMetadata} */
  const chainMetadata = {};

  for (const tm of tms) {
    const {
      caipChainId,
      chainName,
      decimals,
      symbol,
      tokenId,
      usage = [],
    } = tm ?? {};

    /**
     * @type {TokenMetadata}
     */
    const token = {
      caipChainId,
      chainName,
      decimals,
      symbol,
      tokenId,
      usage,
    };

    const chainEntry = provideLazyRecord(chainMetadata, chainName, () => ({
      caipChainId,
      chainName,
      tokenMetadataById: {},
    }));

    provideLazyRecord(
      chainEntry.tokenMetadataById,
      makeTokenIdKey(token.tokenId),
      () => token,
    );
  }

  return harden(chainMetadata);
};
harden(collateTokenMetadata);

/**
 * @template {PortfolioDeployConfig} C
 * @param {C} config
 * @param {Record<string, Partial<ChainTokenMetadata[string]>>} [chainMetadataOverrides]
 * @returns {C & { chainMetadata: ChainTokenMetadata }}
 */
export const withMetadata = (config, chainMetadataOverrides = {}) => {
  const configuredChainTokenMetadata =
    config.chainMetadata || getDefaultChainTokenMetadata(config.cluster);
  const chainMetadata = objectMap(
    { ...configuredChainTokenMetadata, ...chainMetadataOverrides },
    (metadata, chainName) => {
      /** @type {Partial<ChainTokenMetadata[string]>} */
      const base =
        configuredChainTokenMetadata[/** @type {string} */ (chainName)] || {};
      return harden({
        ...base,
        ...metadata,
        tokenMetadataById: {
          ...base.tokenMetadataById,
          ...metadata.tokenMetadataById,
        },
      });
    },
  );
  return harden({ ...config, chainMetadata });
};
harden(withMetadata);

/**
 * Build helpers by caching portions of the config.
 * @param {Pick<PortfolioDeployConfig, 'cluster'>} [config]
 */
export const makeExtractTokenMetadataFromYds = config => {
  const cluster = /** @type {ClusterName} */ (config?.cluster ?? 'testnet');

  const chainNameForCaipChainId =
    /** @type {Map<CaipChainId, SupportedChain>} */ (
      new Map(
        partialMap(
          typedEntries(CaipChainIds[cluster]),
          ([chainName, caipChainId]) =>
            !!caipChainId && [caipChainId, chainName],
        ),
      )
    );

  const usdcTokenIdForChainName = UsdcTokenIds[cluster];

  /**
   * @param {CaipChainId} caipChainId
   * @returns {SupportedChain}
   */
  const getChainName = caipChainId => {
    const chainName = chainNameForCaipChainId.get(caipChainId);
    if (chainName === undefined) {
      throw Error(`Cannot get chainName for caipChainId ${caipChainId}`);
    }
    return chainName;
  };

  /**
   * @param {CaipChainId} caipChainId
   * @param {Uppercase<string>} symbol
   * @returns {string}
   */
  const guessTokenId = memoize2Strings((caipChainId, symbol) => {
    const chainName =
      chainNameForCaipChainId.get(/** @type {CaipChainId} */ (caipChainId)) ??
      `[${caipChainId}]`;
    switch (symbol) {
      case 'USDN': {
        if (chainName === 'noble') return 'uusdn';
        break;
      }
      case 'USDC': {
        const tokenId = Object.getOwnPropertyDescriptor(
          usdcTokenIdForChainName,
          chainName,
        )?.value;
        if (tokenId != null) return tokenId;
        break;
      }
      default:
    }
    return `[${caipChainId} ${symbol}]`;
  });

  /**
   * @param {CaipChainId} caipChainId
   * @param {string} symbol
   * @returns {number}
   */
  const guessDecimals = memoize2Strings((caipChainId, symbol) => {
    if (symbol === 'USDC' || symbol === 'USDN') {
      return 6;
    }
    if (caipChainId.startsWith('cosmos:')) {
      // Cosmos convention.
      return 6;
    }

    if (caipChainId.startsWith('eip155:')) {
      // Ethereum convention.
      return 18;
    }

    throw Error(`Could not guess decimal count for ${caipChainId} ${symbol}`);
  });

  /**
   * Extract per-position and per-chain token metadata from YDS-style JSON.
   *
   * @param {object} ydsInfo
   * @param {YdsInstruments} ydsInfo.instruments
   * @param {YdsRewardTokenRates} ydsInfo.rewardTokenRates
   * @returns {TokenMetadata[]}
   */
  const extractTokenMetadataFromYds = ({ instruments, rewardTokenRates }) => {
    /** @type {Record<string, Map<string, { caipChainId: CaipChainId, chainName: SupportedChain }>>} */
    const instrumentsForProtocolId = {};

    /** @typedef {string} TokenMetadataKey */

    /** @type {Map<TokenMetadataKey, TokenMetadata>} */
    const metadataForTokenId = new Map();

    /**
     * Update/insert the metadata into the compound token key.
     * @param {TokenMetadata} tm
     */
    const upsertTokenMetadata = tm => {
      const { caipChainId, tokenId } = tm;
      const key = /** @type {TokenMetadataKey} */ (
        keyFromStrings([caipChainId, makeTokenIdKey(tokenId)])
      );
      const existing = metadataForTokenId.get(key);
      metadataForTokenId.set(key, {
        ...existing,
        ...tm,
        usage: [
          ...new Set([...(existing?.usage || []), ...(tm.usage || [])]).keys(),
        ],
      });
    };

    const instData = instruments.data;
    if (Array.isArray(instData)) {
      for (const inst of instData) {
        const {
          caipChainId,
          asset: { symbol },
        } = inst;
        const chainName = getChainName(caipChainId);
        if (chainName == null) continue;

        // Record a chain-wide stable token.
        /** @type {TokenMetadata} */
        const stableTokenMetadata = {
          caipChainId,
          chainName,
          tokenId: guessTokenId(caipChainId, symbol),
          decimals: guessDecimals(caipChainId, symbol),
          symbol,
          usage: ['swapTo'],
        };
        upsertTokenMetadata(stableTokenMetadata);

        // Now create the pool entry.
        const {
          id: instrumentId,
          protocol: { id: protocolId },
        } = inst;

        // Populate the record for use by rewardTokenRates.
        const instrumentIds = provideLazyRecord(
          instrumentsForProtocolId,
          protocolId,
          () => new Map(),
        );
        instrumentIds.set(instrumentId, { caipChainId, chainName });
      }
    }

    const rewardData = rewardTokenRates.data;
    if (Array.isArray(rewardData)) {
      for (const reward of rewardData) {
        const {
          evmChainId,
          sourceDenom: rewardSymbol,
          sourceToken: rewardTokenId,
          targetDenom: stableSymbol,
          targetToken: stableTokenId,
        } = reward;

        const caipChainId = /** @type {const} */ (`eip155:${evmChainId}`);
        const chainName = getChainName(caipChainId);

        // Our tokenId/symbol data is more accurate than the instruments view.
        upsertTokenMetadata({
          caipChainId,
          chainName,
          tokenId: stableTokenId,
          symbol: stableSymbol,
          decimals: guessDecimals(caipChainId, stableSymbol),
          usage: ['swapTo'],
        });

        // Now populate the instrument rewards.
        upsertTokenMetadata({
          caipChainId,
          chainName,
          tokenId: rewardTokenId,
          symbol: rewardSymbol,
          decimals: guessDecimals(caipChainId, rewardSymbol),
          usage: ['swapFrom'],
        });
      }
    }

    const tokenMetadata = [...metadataForTokenId.entries()]
      .sort(([ka], [kb]) => cmp(ka, kb))
      .map(([_k, v]) => v);
    return harden(tokenMetadata);
  };

  return harden(extractTokenMetadataFromYds);
};
harden(makeExtractTokenMetadataFromYds);

/**
 *
 * @param {object} opts
 * @param {PortfolioDeployConfig} opts.config
 * @param {string} opts.yds
 * @param {typeof globalThis.fetch} [opts.fetch]
 * @returns {Promise<PortfolioDeployConfig>}
 */
export const updateConfigFromYds = async ({
  config,
  yds,
  fetch = globalThis.fetch,
}) => {
  await null;
  /** @type {Error[]} */
  const errors = [];
  const pushError = err => {
    errors.push(err);
    return undefined;
  };

  // TODO(AGO-1070): Use YDS /tokens with `swapFrom` and/or `swapTo` `usage`.
  const [instruments, rewardTokenRates] = await Promise.all([
    fetchJson(fetch, `${yds}/instruments?includeAll=true`).catch(pushError),
    fetchJson(fetch, `${yds}/reward-token-rates`).catch(pushError),
  ]);

  try {
    if (errors.length) throw errors;

    const extractTokenMetadataFromYds = makeExtractTokenMetadataFromYds(config);
    const ydsInfo = { instruments, rewardTokenRates };
    const tokenMetadata = extractTokenMetadataFromYds(ydsInfo);
    if (!tokenMetadata.length) {
      pushError(Error(`No token metadata found`));
    }
    const metadata = collateTokenMetadata(tokenMetadata);

    if (errors.length) throw errors;
    return withMetadata(config, metadata);
  } catch (err) {
    if (err !== errors) pushError(err);
    throw AggregateError(errors, `Cannot parse YDS responses from ${yds}`);
  }
};
harden(updateConfigFromYds);

/** Avoid needing to call makeExtractTokenMetadataListFromYds. */
export const extractTokenMetadataFromYds = makeExtractTokenMetadataFromYds();
