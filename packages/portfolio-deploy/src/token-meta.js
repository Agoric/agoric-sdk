/* globals globalThis */
import { typedEntries } from '@agoric/internal';
import { PoolPlaces } from '@agoric/portfolio-api/src/places.js';
import {
  CaipChainIds,
  UsdcTokenIds,
} from '@agoric/portfolio-api/src/constants.js';

const { entries, fromEntries } = Object;

/**
 * @import { PoolMetadata, ChainMetadata, TokenMetadata } from '@agoric/portfolio-api';
 */

/**
 * @param {TokenMetadata[]} tms
 * @returns {{ chainMetadata: ChainMetadata; poolMetadata: PoolMetadata }}
 */
export const collateTokenMetadataFromList = tms => {
  /** @type {ChainMetadata} */
  const chainMetadata = {};
  /** @type {PoolMetadata} */
  const poolMetadata = {};

  for (const tm of tms) {
    const { caipChainId, chainName, decimals, symbol, tokenId, instrumentId } =
      tm ?? {};

    const makeScrubbedToken = () => ({
      caipChainId,
      chainName,
      decimals,
      symbol,
      tokenId,
      ...(instrumentId != null && { instrumentId }),
    });

    // Classify the tokens by chain or instrument.
    if (instrumentId == null) {
      const chainMetadataEntry = provideLazyRecord(
        chainMetadata,
        chainName,
        () => ({ stableTokenById: {} }),
      );
      if (chainMetadataEntry == null) continue;

      const { stableTokenById } = chainMetadataEntry;
      provideLazyRecord(stableTokenById, tokenId, makeScrubbedToken);
    } else {
      const poolMetadataEntry = provideLazyRecord(
        poolMetadata,
        /** @type {string} */ (instrumentId),
        () => ({ rewardTokenById: {} }),
      );
      if (poolMetadataEntry == null) continue;

      const { rewardTokenById } = poolMetadataEntry;
      provideLazyRecord(rewardTokenById, tokenId, makeScrubbedToken);
    }
  }

  return harden({ chainMetadata, poolMetadata });
};
harden(collateTokenMetadataFromList);

/**
 * @import { SupportedChain, YieldProtocol } from '@agoric/portfolio-api';
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
 * @template V
 * @template {PropertyKey} [P=PropertyKey]
 * @param {Record<P, V>} record
 * @param {P} prop
 * @param {(prop: P, record: Record<P, V>) => V} initFn
 * @returns {V}
 */
const provideLazyRecord = (record, prop, initFn) => {
  if (prop in record) {
    return record[prop];
  }
  const val = initFn(prop, record);
  record[prop] = val;
  return val;
};

/**
 * @template {(str1: string, str2: string) => unknown} F
 * @param {F} fn
 * @returns {F}
 */
const memoize2Strings = fn => {
  /** @type {Map<`${string}\x00${string}`, unknown>} */
  const memo = new Map();
  const wrapper = (str1, str2) => {
    const key = /** @type {const} */ (`${str1}\x00${str2}`);
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
    throw Error(
      `failed to fetch reward token info from ${url}: ${response.status}`,
    );
  }
  return response.json();
};

/**
 * @returns {PoolMetadata}
 */
export const getDefaultPoolMetadata = () =>
  harden(
    fromEntries(
      entries(PoolPlaces).map(([poolKey, place]) => [
        poolKey,
        harden({
          ...place,
          rewardTokenById: harden({}),
        }),
      ]),
    ),
  );
harden(getDefaultPoolMetadata);

/**
 * @param {string} cluster
 * @returns {ChainMetadata}
 */
export const getDefaultChainMetadata = cluster => {
  const caipChainIdForName = CaipChainIds[cluster];
  const usdcTokenIdForName = UsdcTokenIds[cluster];

  /** @type {ChainMetadata} */
  const chainMetadata = {};
  for (const chainName of Object.keys(caipChainIdForName)) {
    const caipChainId = caipChainIdForName?.[chainName];
    if (!caipChainId) continue;

    /**
     * Here is where we would add other stablecoins.
     *
     * @type {Record<string, TokenMetadata>}
     */
    const stableTokenById = {};

    const usdcTokenId = usdcTokenIdForName?.[chainName];
    if (usdcTokenId) {
      const token = {
        chainName,
        caipChainId,
        symbol: 'USDC',
        tokenId: usdcTokenId,
        // Current conventional decimals.  We can always override.
        decimals: 6,
      };
      stableTokenById[usdcTokenId] = token;
    }

    chainMetadata[chainName] = { stableTokenById };
  }
  return harden(chainMetadata);
};
harden(getDefaultChainMetadata);

/**
 * @template {PortfolioDeployConfig} C
 * @param {C} config
 * @param {object} [metadata]
 * @param {ChainMetadata} [metadata.chainMetadata]
 * @param {PoolMetadata} [metadata.poolMetadata]
 * @returns {C & { chainMetadata: ChainMetadata; poolMetadata: PoolMetadata }}
 */
export const withMetadata = (config, { poolMetadata, chainMetadata } = {}) =>
  harden(
    (() => {
      const configuredPoolMetadata =
        config.poolMetadata || getDefaultPoolMetadata();
      const configuredChainMetadata =
        config.chainMetadata || getDefaultChainMetadata(config.cluster);
      return harden(
        /** @type {const} */ ({
          ...config,
          poolMetadata: harden(
            fromEntries(
              entries({
                ...configuredPoolMetadata,
                ...poolMetadata,
              }).map(([poolKey, metadata]) => {
                const base = configuredPoolMetadata[poolKey] || {
                  rewardTokenById: {},
                };
                return [
                  poolKey,
                  harden({
                    ...base,
                    ...metadata,
                    rewardTokenById: harden({
                      ...base.rewardTokenById,
                      ...metadata.rewardTokenById,
                    }),
                  }),
                ];
              }),
            ),
          ),
          chainMetadata: harden(
            fromEntries(
              entries({
                ...configuredChainMetadata,
                ...chainMetadata,
              }).map(([chainName, metadata]) => {
                const base = configuredChainMetadata[chainName] || {
                  stableTokenById: {},
                };
                return [
                  chainName,
                  harden({
                    ...base,
                    ...metadata,
                    stableTokenById: harden({
                      ...base.stableTokenById,
                      ...metadata.stableTokenById,
                    }),
                  }),
                ];
              }),
            ),
          ),
        }),
      );
    })(),
  );
harden(withMetadata);

/**
 * Build helpers by caching portions of the config.
 * @param {Pick<PortfolioDeployConfig, 'cluster'>} [config]
 */
export const makeExtractMetadataFromYds = config => {
  const cluster = /** @type {ClusterName} */ (config?.cluster ?? 'testnet');

  /** @type {Record<CaipChainId, SupportedChain>} */
  const chainNameForCaipChainId = {};
  for (const [chainName, caipChainId] of typedEntries(CaipChainIds[cluster])) {
    if (caipChainId) {
      chainNameForCaipChainId[caipChainId] = chainName;
    }
  }

  const usdcTokenIdForChainName = UsdcTokenIds[cluster];

  /**
   * @param {string} caipChainId
   * @returns {string | null}
   */
  const getChainName = caipChainId =>
    chainNameForCaipChainId[caipChainId] ?? null;

  /**
   * @param {CaipChainId} caipChainId
   * @param {Uppercase<string>} symbol
   * @returns {string}
   */
  const guessTokenId = memoize2Strings((caipChainId, symbol) => {
    const chainName =
      chainNameForCaipChainId[caipChainId] ?? `[${caipChainId}]`;
    switch (symbol) {
      case 'USDN': {
        if (chainName === 'noble') {
          return 'uusdn';
        }
        break;
      }

      case 'USDC': {
        const tokenId = usdcTokenIdForChainName?.[chainName];
        if (tokenId != null) {
          return tokenId;
        }
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

    // Whatever.
    return 6;
  });

  /**
   * @param {CaipChainId} caipChainId
   * @param {Uppercase<string>} rewardSymbol
   * @returns {{ protocolName?: string; instrumentId?: InstrumentId }}
   */
  const guessRewardProtocol = memoize2Strings((caipChainId, rewardSymbol) => {
    switch (rewardSymbol) {
      case 'COMP': {
        return harden({ protocolName: 'Compound' });
      }
      case 'MORPHO': {
        return harden({ protocolName: 'Morpho' });
      }
      default: {
        const chainName = getChainName(caipChainId);
        switch (chainName) {
          case 'Base': {
            if (rewardSymbol === 'SEAM') {
              return harden({ instrumentId: 'Beefy_morphoSeamlessUsdc_Base' });
            }
            break;
          }
          case 'Optimism': {
            if (rewardSymbol === 'OP') {
              return harden({ instrumentId: 'Aave_Optimism' });
            }
            break;
          }
          default:
        }
        // Title case the rewardSymbol.
        const protocolName = `${rewardSymbol[0].toUpperCase()}${rewardSymbol.slice(1).toLowerCase()}`;
        return harden({ protocolName });
      }
    }
  });

  /**
   * Extract per-position and per-chain token metadata from YDS-style JSON.
   *
   * @param {object} ydsInfo
   * @param {YdsInstruments} ydsInfo.instruments
   * @param {YdsRewardTokenRates} ydsInfo.rewardTokenRates
   * @returns {{ poolMetadata: PoolMetadata; chainMetadata: ChainMetadata }}
   */
  const extractMetadataFromYds = ({ instruments, rewardTokenRates }) => {
    /** @type {Record<string, Set<string>>} */
    const instrumentIdsForProtocolName = {};

    /** @type {ChainMetadata} */
    const chainMetadata = {};
    /** @type {PoolMetadata} */
    const poolMetadata = {};

    const instData = instruments.data;
    if (Array.isArray(instData)) {
      for (const inst of instData) {
        const {
          caipChainId,
          asset: { symbol },
        } = inst;
        const chainName = getChainName(caipChainId);
        if (chainName == null) continue;

        // Record the chain-wide stable token.
        const stableTokenId = guessTokenId(caipChainId, symbol);
        const { stableTokenById } = provideLazyRecord(
          chainMetadata,
          /** @type {string} */ (chainName),
          () => ({
            stableTokenById: {},
          }),
        );

        provideLazyRecord(stableTokenById, stableTokenId, tokenId => ({
          caipChainId,
          chainName,
          tokenId,
          decimals: guessDecimals(caipChainId, symbol),
          symbol,
        }));

        // Now create the pool entry.
        const {
          id: instrumentId,
          protocol: { name: protocolName },
        } = inst;

        // Prep the pool-only reward token, but don't populate here.
        provideLazyRecord(
          poolMetadata,
          /** @type {string} */ (instrumentId),
          () => ({
            protocol: /** @type {YieldProtocol} */ (protocolName),
            rewardTokenById: {},
          }),
        );

        // Populate the map for use by rewardTokenRates.
        const instrumentIds = provideLazyRecord(
          instrumentIdsForProtocolName,
          protocolName,
          () => new Set(),
        );
        instrumentIds.add(instrumentId);
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
        if (chainName == null) continue;

        const { stableTokenById } = provideLazyRecord(
          chainMetadata,
          /** @type {string} */ (chainName),
          () => ({
            stableTokenById: {},
          }),
        );

        const stableToken = provideLazyRecord(
          stableTokenById,
          stableTokenId,
          () => ({
            caipChainId,
            chainName,
          }),
        );

        // Our tokenId/symbol data is more accurate than the instruments view.
        const populatedStableToken = {
          ...stableToken,
          tokenId: stableTokenId,
          symbol: stableSymbol,
          decimals: guessDecimals(caipChainId, stableSymbol),
        };
        stableTokenById[stableTokenId] = populatedStableToken;

        // Now populate the reward instruments.
        const proto = guessRewardProtocol(caipChainId, rewardSymbol);
        const rewardInstruments = [];
        if ('protocolName' in proto) {
          rewardInstruments.push(
            ...(instrumentIdsForProtocolName[proto.protocolName]?.keys() ?? []),
          );
        }
        if ('instrumentId' in proto) {
          rewardInstruments.push(proto.instrumentId);
        }
        for (const instrumentId of rewardInstruments) {
          const { rewardTokenById } =
            provideLazyRecord(poolMetadata, instrumentId, () => ({
              rewardTokenById: {},
            })) ?? {};

          if (!rewardTokenById) continue;
          provideLazyRecord(rewardTokenById, rewardTokenId, tokenId => ({
            caipChainId,
            chainName,
            tokenId,
            symbol: rewardSymbol,
            decimals: guessDecimals(caipChainId, rewardSymbol),
          }));
        }
      }
    }

    return harden({
      chainMetadata,
      poolMetadata,
    });
  };

  return harden({
    extractMetadataFromYds,
    extractTokenMetadataList: collateTokenMetadataFromList,
  });
};
harden(makeExtractMetadataFromYds);

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
  const errors = [];
  let rewardTokenRates;
  try {
    const rewardTokenRatesUrl = `${yds}/reward-token-rates`;
    rewardTokenRates = await fetchJson(fetch, rewardTokenRatesUrl);
  } catch (e) {
    errors.push(e);
  }

  let instruments;
  try {
    const instrumentsUrl = `${yds}/instruments?includeAll=true`;
    instruments = await fetchJson(fetch, instrumentsUrl);
  } catch (e) {
    errors.push(e);
  }

  if (!errors.length) {
    try {
      const { extractMetadataFromYds: extractMetadataFromLegacyYds } =
        makeExtractMetadataFromYds(config);
      const { chainMetadata, poolMetadata } = extractMetadataFromLegacyYds({
        instruments,
        rewardTokenRates,
      });

      if (!chainMetadata || !entries(chainMetadata).length) {
        errors.push(Error(`no chain metadata found`));
      }
      if (!poolMetadata || !entries(poolMetadata).length) {
        errors.push(Error(`no pool metadata found`));
      }
      if (!errors.length) {
        return withMetadata(config, {
          poolMetadata,
          chainMetadata,
        });
      }
    } catch (e) {
      errors.push(e);
    }
  }

  if (errors.length) {
    throw AggregateError(errors, `Cannot parse YDS responses from ${yds}`);
  }
  return config;
};
harden(updateConfigFromYds);

/** Avoid needing to call makeExtractMetadataFromYds. */
export const extractMetadataFromYds = makeExtractMetadataFromYds();
