/**
 * @import {ChainHub, ChainHubOptions, ChainInfo, Denom, DenomDetail} from '../types.js';
 * @import {Brand} from '@agoric/ertp';
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
 * @param {object} [opts]
 * @param {Console['log']} [opts.log]
 * @param {boolean} [opts.upsert=false] - whether to upsert (true) or error on existing (false)
 */
export const registerChainsAndAssets = (
  chainHub,
  brands,
  chainInfo,
  assetInfo,
  opts,
) => {
  const { log = () => {}, upsert = false } = opts || {};
  log('chainHub: registering chains', Object.keys(chainInfo || {}));
  if (!chainInfo) {
    return;
  }

  /** @type {ChainHubOptions} */
  const chOpts = { upsert };

  const conns = {};
  for (const [chainName, allInfo] of Object.entries(chainInfo)) {
    if (allInfo.namespace === 'cosmos') {
      const { connections, ...info } = allInfo;
      chainHub.registerChain(chainName, info, chOpts);
      if (connections) conns[info.chainId] = connections;
    } else {
      chainHub.registerChain(chainName, allInfo, chOpts);
    }
  }
  const registeredPairs = new Set();
  for (const [pChainId, connInfos] of Object.entries(conns)) {
    for (const [cChainId, connInfo] of Object.entries(connInfos)) {
      const pair = [pChainId, cChainId].sort().join('<->');
      if (!registeredPairs.has(pair)) {
        chainHub.registerConnection(pChainId, cChainId, connInfo, chOpts);
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
    chainHub.registerAsset(denom, infoWithBrand, chOpts);
  }
};
