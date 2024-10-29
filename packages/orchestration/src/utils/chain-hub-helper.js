import { E } from '@endo/far';
import { denomHash } from './denomHash.js';

/**
 * @import {ERef} from '@endo/far';
 * @import {KnownChains} from '../chain-info.js';
 * @import {ChainHubAdmin} from '../exos/chain-hub-admin.js';
 */

/**
 * Consider this a sloppy hack until #9752
 *
 * @param {ERef<ChainHubAdmin>} chainHubAdmin
 * @param {KnownChains} chainInfo
 * @param {Record<string, Brand<'nat'>>} brands
 */
export const registerKnownChainsAndAssets = async (
  chainHubAdmin,
  chainInfo,
  brands,
) => {
  await Promise.all([
    // multichain-e2e flows
    E(chainHubAdmin).populateChainsAndConnection('agoric', 'cosmoshub'),
    E(chainHubAdmin).populateChainsAndConnection('agoric', 'osmosis'),
    E(chainHubAdmin).populateChainsAndConnection('cosmoshub', 'osmosis'),
    // FastUSDC
    E(chainHubAdmin).populateChainsAndConnection('agoric', 'noble'),
    E(chainHubAdmin).populateChainsAndConnection('dydx', 'noble'),
  ]);

  await Promise.all([
    // agoric
    E(chainHubAdmin).registerAsset('ubld', {
      chainName: 'agoric',
      baseName: 'agoric',
      baseDenom: 'ubld',
      brand: brands?.BLD,
    }),
    E(chainHubAdmin).registerAsset('uist', {
      chainName: 'agoric',
      baseName: 'agoric',
      baseDenom: 'uist',
      brand: brands?.IST,
    }),
    E(chainHubAdmin).registerAsset(
      `ibc/${denomHash({
        channelId:
          chainInfo.agoric.connections['noble-1'].transferChannel.channelId,
        denom: 'uusdc',
      })}`,
      {
        chainName: 'agoric',
        baseName: 'noble',
        baseDenom: 'uusdc',
        brand: brands?.USDC,
      },
    ),
    // noble
    E(chainHubAdmin).registerAsset('uusdc', {
      chainName: 'noble',
      baseName: 'noble',
      baseDenom: 'uusdc',
    }),
    // dydx
    E(chainHubAdmin).registerAsset(
      `ibc/${denomHash({
        channelId:
          chainInfo.dydx.connections['noble-1'].transferChannel.channelId,
        denom: 'uusdc',
      })}`,
      {
        chainName: 'dydx',
        baseName: 'noble',
        baseDenom: 'uusdc',
      },
    ),
  ]);
};
