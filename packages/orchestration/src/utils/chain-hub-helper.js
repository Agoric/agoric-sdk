/**
 * @import {ChainHub, CosmosChainInfo, Denom, DenomDetail} from '../types.js';
 */

/**
 * Registers chains, connections, assets in the provided chainHub.
 *
 * If either is not provided, registration will be skipped.
 *
 * @param {ChainHub} chainHub
 * @param {Record<string, Brand<'nat'>>} brands
 * @param {Record<string, CosmosChainInfo> | undefined} chainInfo
 * @param {Record<Denom, DenomDetail & { brandKey?: string }> | undefined} assetInfo
 */
export const registerChainsAndAssets = (
  chainHub,
  brands,
  chainInfo,
  assetInfo,
) => {
  if (!chainInfo) {
    console.log('No chain info provided, returning early.');
    return;
  }

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

  if (!assetInfo) {
    console.log('No asset info provided, returning early.');
    return;
  }
  for (const [denom, info] of Object.entries(assetInfo)) {
    const infoWithBrand = info.brandKey
      ? { ...info, brand: brands[info.brandKey] }
      : info;
    chainHub.registerAsset(denom, infoWithBrand);
  }
};
