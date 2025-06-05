import { E } from '@endo/eventual-send';
import { M, mustMatch, objectMap } from '@endo/patterns';
import { HubName } from './constants.js';
import { normalizeConnectionInfo } from './exos/chain-hub.js';
import {
  ChainInfoShape,
  CosmosAssetInfoShape,
  DenomDetailShape,
} from './typeGuards.js';
import { denomHash } from './utils/denomHash.js';

/**
 * @import {CosmosAssetInfo, IBCConnectionInfo} from './types.js';
 * @import {IBCChannelID, NameAdmin} from '@agoric/vats';
 * @import {ChainInfo, Denom} from './orchestration-api.ts';
 * @import {CosmosChainInfo} from './cosmos-api.ts';
 * @import {DenomDetail} from './types.ts';
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
 * NOTE: assets are replaced, not added
 *
 * @param {ERef<NameAdmin>} agoricNamesAdmin
 * @param {string} name
 * @param {[string, DenomDetail][]} assets
 * @alpha
 */
export const registerChainAssets = async (agoricNamesAdmin, name, assets) => {
  mustMatch(assets, M.arrayOf([M.string(), DenomDetailShape]));
  const { nameAdmin: assetAdmin } = await E(agoricNamesAdmin).provideChild(
    HubName.ChainAssets,
  );
  return E(assetAdmin).update(name, assets);
};

const { entries, fromEntries } = Object;

/**
 * @param {Record<string, ChainInfo>} chainInfo
 * @returns {Record<string, CosmosChainInfo>}
 */
export const selectCosmosChainInfo = chainInfo =>
  // @ts-expect-error filter out all but CosmosChainInfo
  harden(
    fromEntries(
      entries(chainInfo).filter(([_n, info]) => 'bech32Prefix' in info),
    ),
  );

/**
 * @param {Record<string, ChainInfo>} chainInfo
 */
export const makeDenomTools = chainInfo => {
  const cosmosChainInfo = selectCosmosChainInfo(chainInfo);
  /**
   * @param {string} destChainId
   * @param {string} fromChainName
   * @returns {IBCChannelID | undefined}
   */
  const getTransferChannelId = (destChainId, fromChainName) =>
    cosmosChainInfo[fromChainName]?.connections?.[destChainId]?.transferChannel
      .channelId;

  /**
   * @param {Denom} denom
   * @param {string} destChainId
   * @param {string} fromChainName
   * @returns {Denom}
   */
  const toDenomHash = (denom, destChainId, fromChainName) => {
    const channelId = getTransferChannelId(destChainId, fromChainName);
    if (!channelId) {
      throw new Error(
        `No channel found for ${destChainId} -> ${fromChainName}`,
      );
    }
    return `ibc/${denomHash({ denom, channelId })}`;
  };

  return harden({ getTransferChannelId, toDenomHash });
};

/**
 * Make asset info for the current environment.
 *
 * TODO: NEEDSTEST
 *
 * until #10580, the contract's `issuerKeywordRecord` must include 'ATOM',
 * 'OSMO', 'IST', etc. for the local `chainHub` to know about brands.
 *
 * @param {Record<string, ChainInfo>} chainInfo
 * @param {Record<string, Denom[]>} tokenMap
 * @returns {[Denom, DenomDetail][]}
 */
export const makeAssetInfo = (
  chainInfo,
  tokenMap = {
    agoric: ['ubld', 'uist'],
    cosmoshub: ['uatom'],
    noble: ['uusdc'],
    osmosis: ['uosmo', 'uion'],
  },
) => {
  const { toDenomHash } = makeDenomTools(chainInfo);

  // only include chains present in `chainInfo`
  const tokens = Object.entries(tokenMap)
    .filter(([chain]) => chain in chainInfo)
    .flatMap(([chain, denoms]) => denoms.map(denom => ({ denom, chain })));

  /** @type {[Denom, DenomDetail][]} */
  const assetInfo = [];
  for (const { denom, chain } of tokens) {
    const baseDetails = {
      baseName: chain,
      baseDenom: denom,
    };

    // Add native token entry
    assetInfo.push([
      denom,
      {
        ...baseDetails,
        chainName: chain,
        ...(chain === 'agoric' && {
          // `brandKey` instead of `brand` until #10580
          // assumes issuerKeywordRecord includes brand keywords like `IST`, `OSMO`
          brandKey: denom.replace(/^u/, '').toUpperCase(),
        }),
      },
    ]);

    // Add IBC entries for non-issuing chains
    if (chainInfo[chain].namespace !== 'cosmos') continue;
    const issuingChainId = chainInfo[chain].chainId;
    for (const holdingChain of Object.keys(chainInfo)) {
      if (holdingChain === chain) continue;
      assetInfo.push([
        toDenomHash(denom, issuingChainId, holdingChain),
        {
          ...baseDetails,
          chainName: holdingChain,
          ...(holdingChain === 'agoric' && {
            // `brandKey` instead of `brand` until #10580
            // assumes issuerKeywordRecord includes brand keywords like `IST`, `OSMO`
            brandKey: denom.replace(/^u/, '').toUpperCase(),
          }),
        },
      ]);
    }
  }

  return harden(assetInfo);
};
