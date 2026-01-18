/**
 * @import {ChainHub, ChainHubOptions, ChainInfo, Denom, DenomDetail} from '../types.js';
 */

/**
 * Registers chains, connections, assets in the provided chainHub, updating
 * existing records.
 *
 * If either is not provided, registration will be skipped.
 *
 * TODO #10580 remove 'brandKey' in favor of `LegibleCapData`
 *
 * @param {ChainHub} chainHub
 * @param {Record<string, Brand<'nat'>>} brands
 * @param {Record<string, ChainInfo> | undefined} chainInfo
 * @param {[Denom, DenomDetail & { brandKey?: string }][] | undefined} assetInfo
 * @param {object} opts
 * @param {Console['log']} [opts.log]
 */
export const registerChainsAndAssets = (
  chainHub,
  brands,
  chainInfo,
  assetInfo,
  { log = () => {} } = {},
) => {
  log('chainHub: registering chains', Object.keys(chainInfo || {}));
  if (!chainInfo) {
    return;
  }

  // Always upsert to ensure no conflicts with existing data.
  /** @type {ChainHubOptions} */
  const opts = { upsert: true };

  const conns = {};
  for (const [chainName, allInfo] of Object.entries(chainInfo)) {
    if (allInfo.namespace === 'cosmos') {
      const { connections, ...info } = allInfo;
      chainHub.updateChain(chainName, info, opts);
      if (connections) conns[info.chainId] = connections;
    } else {
      chainHub.updateChain(chainName, allInfo, opts);
    }
  }
  const registeredPairs = new Set();
  for (const [pChainId, connInfos] of Object.entries(conns)) {
    for (const [cChainId, connInfo] of Object.entries(connInfos)) {
      const pair = [pChainId, cChainId].sort().join('<->');
      if (!registeredPairs.has(pair)) {
        chainHub.updateConnection(pChainId, cChainId, connInfo, opts);
        registeredPairs.add(pair);
      }
    }
  }
  log('chainHub: registered connections', [...registeredPairs].sort());

  log(
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
    chainHub.updateAsset(denom, infoWithBrand, opts);
  }
};
