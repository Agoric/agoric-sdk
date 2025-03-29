/**
 * @import {CaipChainId, ChainHub, ChainInfo, CosmosChainInfo, Denom, DenomDetail} from '../types.js';
 */

/**
 * @param {ChainInfo} info
 * @returns {CaipChainId}
 */
export const chainInfoCaipId = info => {
  return `${info.namespace}:${info.reference}`;
};
