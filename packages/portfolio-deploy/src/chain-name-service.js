import { denomHash } from '@agoric/orchestration';

/**
 * @import {IBCChannelID, NameAdmin} from '@agoric/vats';
 * @import {ChainInfo, Denom} from '@agoric/orchestration';
 * @import {CosmosChainInfo} from '@agoric/orchestration';
 * @import {DenomDetail} from '@agoric/orchestration';
 */

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
      if (chainInfo[holdingChain].namespace !== 'cosmos') continue;
      if (!chainInfo[chain]?.connections?.[chainInfo[holdingChain].chainId]) {
        console.debug(
          'Cannot register',
          denom,
          'on',
          holdingChain,
          '; no connection from',
          chain,
        );
        continue;
      }
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
