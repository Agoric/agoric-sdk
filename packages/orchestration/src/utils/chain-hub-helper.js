/**
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
export const registerChainsAndAssets = (
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
  const registeredPairs = new Set();
  for (const [pChainId, connInfos] of Object.entries(conns)) {
    for (const [cChainId, connInfo] of Object.entries(connInfos)) {
      const pair = [pChainId, cChainId].sort().join('');
      if (!registeredPairs.has(pair)) {
        chainHub.registerConnection(pChainId, cChainId, connInfo);
        registeredPairs.add(pair);
      }
    }
  }

  for (const [denom, info] of Object.entries(assetInfo)) {
    const infoWithBrand = info.brandKey
      ? { ...info, brand: brands[info.brandKey] }
      : info;
    chainHub.registerAsset(denom, infoWithBrand);
  }
};
