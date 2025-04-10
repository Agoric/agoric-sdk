/**
 * @import {CaipChainId, ChainHub, ChainInfo, CosmosChainInfo, Denom, DenomDetail, Caip10Record} from '../types.js';
 */

/**
 * @param {ChainInfo | Caip10Record} info
 * @returns {CaipChainId}
 */
export const caipIdFromInfo = info => {
  return `${info.namespace}:${info.reference}`;
};
