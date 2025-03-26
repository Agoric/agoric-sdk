/**
 * @import {ChainHub, ChainInfo, CosmosChainInfo, Denom, DenomDetail} from '../types.js';
 */

/**
 * Registers chains, connections, assets in the provided chainHub.
 *
 * If either is not provided, registration will be skipped.
 *
 * TODO #10580 remove 'brandKey' in favor of `LegibleCapData`
 *
 * @param {ChainHub} chainHub
 * @param {Record<string, Brand<'nat'>>} brands
 * @param {Record<string, ChainInfo> | undefined} chainInfo
 * @param {[Denom, DenomDetail & { brandKey?: string }][] | undefined} assetInfo
 */
export const registerChainsAndAssets = (
  chainHub,
  brands,
  chainInfo,
  assetInfo,
) => {
  console.log('chainHub: registering chains', Object.keys(chainInfo || {}));
  if (!chainInfo) {
    return;
  }

  const conns = {};
  for (const [chainName, allInfo] of Object.entries(chainInfo)) {
    if (allInfo.namespace === 'cosmos') {
      const { connections, ...info } = allInfo;
      chainHub.registerChain(chainName, info);
      if (connections) conns[info.chainId] = connections;
    } else {
      chainHub.registerChain(chainName, allInfo);
    }
  }
  const registeredPairs = new Set();
  for (const [pChainId, connInfos] of Object.entries(conns)) {
    for (const [cChainId, connInfo] of Object.entries(connInfos)) {
      const pair = [pChainId, cChainId].sort().join('<->');
      if (!registeredPairs.has(pair)) {
        chainHub.registerConnection(pChainId, cChainId, connInfo);
        registeredPairs.add(pair);
      }
    }
  }
  console.log('chainHub: registered connections', [...registeredPairs].sort());

  console.log(
    'chainHub: registering assets',
    assetInfo?.map(([denom, { chainName }]) => `${chainName}: ${denom}`),
  );
  if (!assetInfo) {
    return;
  }
  for (const [denom, info] of assetInfo) {
    const { brandKey, ...rest } = info;
    const infoWithBrand = brandKey
      ? { ...rest, brand: brands[brandKey] }
      : rest;
    chainHub.registerAsset(denom, infoWithBrand);
  }
};
