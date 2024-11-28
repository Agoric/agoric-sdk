import { denomHash } from './denomHash.js';

/**
 * @import {ChainHub, CosmosChainInfo, Denom, DenomDetail} from '../types.js';
 */

/**
 * Helper function for creating {@link DenomDetail} data for {@link ChainHub}
 * asset registration.
 *
 * TODO #10580 remove 'brandKey' in favor of `LegibleCapData`
 *
 * @param {Denom} baseDenom
 * @param {string} baseName
 * @param {string} [chainName]
 * @param {Record<string, CosmosChainInfo>} [infoOf]
 * @param {string} [brandKey]
 * @returns {[string, DenomDetail & { brandKey?: string }]}
 */
export const assetOn = (baseDenom, baseName, chainName, infoOf, brandKey) => {
  if (!chainName) {
    return [baseDenom, { baseName, chainName: baseName, baseDenom }];
  }
  if (!infoOf) throw Error(`must provide infoOf`);
  const issuerInfo = infoOf[baseName];
  const holdingInfo = infoOf[chainName];
  if (!holdingInfo) throw Error(`${chainName} missing`);
  if (!holdingInfo.connections)
    throw Error(`connections missing for ${chainName}`);
  const { channelId } =
    holdingInfo.connections[issuerInfo.chainId].transferChannel;
  const denom = `ibc/${denomHash({ denom: baseDenom, channelId })}`;
  return [denom, { baseName, chainName, baseDenom, brandKey }];
};
