import {
  denomHash,
  type CosmosChainInfo,
  type Denom,
  type DenomDetail,
} from '@agoric/orchestration';
import type { IBCChannelID } from '@agoric/vats';

/** make asset info for current env */
export const makeAssetInfo = (
  chainInfo: Record<string, CosmosChainInfo>,
  tokenMap: Record<string, Denom[]> = {
    agoric: ['ubld', 'uist'],
    cosmoshub: ['uatom'],
    noble: ['uusdc'],
    osmosis: ['uosmo', 'uion'],
  },
): [Denom, DenomDetail][] => {
  const getChannelId = (
    issuingChainId: string,
    holdingChainName: string,
  ): IBCChannelID | undefined =>
    chainInfo[holdingChainName]?.connections?.[issuingChainId]?.transferChannel
      .channelId;

  const toDenomHash = (
    denom: Denom,
    issuingChainId: string,
    holdingChainName: string,
  ): Denom => {
    const channelId = getChannelId(issuingChainId, holdingChainName);
    if (!channelId) {
      throw new Error(
        `No channel found for ${issuingChainId} -> ${holdingChainName}`,
      );
    }
    return `ibc/${denomHash({ denom, channelId })}`;
  };

  // only include chains present in `chainInfo`
  const tokens = Object.entries(tokenMap)
    .filter(([chain]) => chain in chainInfo)
    .flatMap(([chain, denoms]) => denoms.map(denom => ({ denom, chain })));

  const assetInfo: [Denom, DenomDetail][] = [];
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
      },
    ]);

    // Add IBC entries for non-issuing chains
    const issuingChainId = chainInfo[chain].chainId;
    for (const holdingChain of Object.keys(chainInfo)) {
      if (holdingChain === chain) continue;
      assetInfo.push([
        toDenomHash(denom, issuingChainId, holdingChain),
        {
          ...baseDetails,
          chainName: holdingChain,
        },
      ]);
    }
  }

  return harden(assetInfo);
};
