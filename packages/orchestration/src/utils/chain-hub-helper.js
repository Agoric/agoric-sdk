/**
 * @import {ChainInfo, KnownChains} from '../chain-info.js';
 * @import {ChainHub, CosmosChainInfo, Denom} from '../types.js';
 */

/**
 * @param {ChainHub} chainHub
 * @param {Record<string, Brand<'nat'>>} brands
 * @param {Record<string, CosmosChainInfo>} chainInfo
 * @param {Record<
 *   Denom,
 *   {
 *     chainName: string;
 *     baseName: string;
 *     baseDenom: Denom;
 *     brandKey?: string;
 *   }
 * >} assetInfo
 */
export const registerKnownChainsAndAssets = (
  chainHub,
  brands,
  chainInfo,
  assetInfo,
) => {
  const conns = {};
  for (const [chainName, allInfo] of Object.entries(chainInfo)) {
    const { connections, ...info } = allInfo;
    chainHub.registerChain(chainName, info);
    conns[info.chainId] = connections;
  }
  for (const [pChainId, connInfos] of Object.entries(conns)) {
    for (const [cChainId, connInfo] of Object.entries(connInfos)) {
      // XXX account for dupes
      chainHub.registerConnection(pChainId, cChainId, connInfo);
    }
  }

  for (const [denom, info] of Object.entries(assetInfo)) {
    const infoWithBrand = info.brandKey
      ? { ...info, brand: brands[info.brandKey] }
      : info;
    chainHub.registerAsset(denom, infoWithBrand);
  }
};
