/**
 * @import {ChainHub, ChainInfo, Denom, DenomDetail, IBCConnectionInfo} from '../types.js';
 */

/**
 * @param {ChainHub} chainHub
 * @param {{
 *   primary: string;
 *   counterparty: string;
 *   info: IBCConnectionInfo;
 * }[]} conns
 * @param {object} [opts]
 * @param {Console['log']} [opts.log]
 */
export const registerConnections = (
  chainHub,
  conns,
  { log = () => {} } = {},
) => {
  const registeredPairs = new Set();
  for (const { primary, counterparty, info } of conns) {
    const pair = [primary, counterparty].sort().join('<->');
    if (!registeredPairs.has(pair)) {
      chainHub.registerConnection(primary, counterparty, info);
      registeredPairs.add(pair);
    }
  }
  log('chainHub: registered connections', [...registeredPairs].sort());
};

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

  const { entries } = Object;
  /**
   * @type {{
   *   primary: string;
   *   counterparty: string;
   *   info: IBCConnectionInfo;
   * }[]}
   */
  const conns = [];
  for (const [chainName, allInfo] of Object.entries(chainInfo)) {
    if (allInfo.namespace === 'cosmos') {
      const { connections, ...info } = allInfo;
      chainHub.registerChain(chainName, info);
      if (connections) {
        conns.push(
          ...entries(connections).map(([k, v]) => ({
            primary: chainName,
            counterparty: k,
            info: v,
          })),
        );
      }
    } else {
      chainHub.registerChain(chainName, allInfo);
    }
  }
  registerConnections(chainHub, conns, { log });

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
    chainHub.registerAsset(denom, infoWithBrand);
  }
};
