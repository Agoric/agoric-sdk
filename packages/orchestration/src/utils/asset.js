import { denomHash } from './denomHash.js';

/**
 * @import {ChainHub, CosmosChainInfo, Denom, DenomDetail} from '../types.js';
 */

/**
 * Helper function for creating {@link DenomDetail} data for {@link ChainHub}
 * asset registration.
 *
 * @param {Denom} baseDenom
 * @param {string} baseName
 * @param {Brand<'nat'>} [brand]
 * @param {string} [chainName]
 * @param {Record<string, CosmosChainInfo>} [infoOf]
 * @returns {[string, DenomDetail]}
 */
export const assetOn = (baseDenom, baseName, brand, chainName, infoOf) => {
  const baseDetail = { baseName, chainName: chainName || baseName, baseDenom };
  const detail = brand ? { ...baseDetail, brand } : baseDetail;
  if (!chainName) return harden([baseDenom, detail]);

  if (!infoOf) throw Error(`must provide infoOf`);
  const issuerInfo = infoOf[baseName];
  const holdingInfo = infoOf[chainName];
  if (!holdingInfo) throw Error(`${chainName} missing`);
  if (!holdingInfo.connections)
    throw Error(`connections missing for ${chainName}`);
  const { channelId } =
  holdingInfo.connections[issuerInfo.chainId].transferChannel;
  const denom = `ibc/${denomHash({ denom: baseDenom, channelId })}`;
  return harden([denom, detail]);
};
