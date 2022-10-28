// @ts-check
import { stakeCurrency, stableCurrency, bech32Config } from './chainInfo.js';

export const AGORIC_COIN_TYPE = 564;
export const COSMOS_COIN_TYPE = 118;

/**
 * @param {import('@agoric/casting/src/netconfig.js').NetworkConfig} networkConfig
 * @param {string} caption
 * @param {number} randomFloat
 * @param {string} [walletUrlForStaking]
 * @returns {import('@keplr-wallet/types').ChainInfo}
 */
export const makeChainInfo = (
  networkConfig,
  caption,
  randomFloat,
  walletUrlForStaking,
) => {
  const { chainName, rpcAddrs, apiAddrs } = networkConfig;
  const index = Math.floor(randomFloat * rpcAddrs.length);

  const rpcAddr = rpcAddrs[index];
  const rpc = rpcAddr.match(/:\/\//) ? rpcAddr : `http://${rpcAddr}`;

  const rest = apiAddrs
    ? // pick the same index
      apiAddrs[index]
    : // adapt from rpc
      rpc.replace(/(:\d+)?$/, ':1317');

  return {
    rpc,
    rest,
    chainId: chainName,
    chainName: caption,
    stakeCurrency,
    walletUrlForStaking,
    bip44: {
      coinType: AGORIC_COIN_TYPE,
    },
    bech32Config,
    currencies: [stakeCurrency, stableCurrency],
    feeCurrencies: [stableCurrency],
    features: ['stargate', 'ibc-transfer'],
  };
};

/**
 * @param {string} networkConfigHref
 * @param {object} io
 * @param {typeof fetch} io.fetch
 * @param {import('@keplr-wallet/types').Keplr} io.keplr
 * @param {typeof Math.random} io.random
 * @param {string} [caption]
 */
export async function suggestChain(
  networkConfigHref,
  { fetch, keplr, random },
  caption = undefined,
) {
  console.log('suggestChain: fetch', networkConfigHref); // log net IO
  const url = new URL(networkConfigHref);
  const res = await fetch(url);
  if (!res.ok) {
    throw Error(`Cannot fetch network: ${res.status}`);
  }

  const networkConfig = await res.json();
  // XXX including this breaks the Jest test
  // assertNetworkConfig(harden(networkConfig));

  if (!caption) {
    const subdomain = url.hostname.split('.')[0];
    caption = `Agoric ${subdomain}`;
  }

  const walletUrlForStaking = `https://${url.hostname}.staking.agoric.app`;

  const chainInfo = makeChainInfo(
    networkConfig,
    caption,
    random(),
    walletUrlForStaking,
  );
  console.log('chainInfo', chainInfo);
  await keplr.experimentalSuggestChain(chainInfo);
  await keplr.enable(chainInfo.chainId);
  console.log('keplr.enable chainId =', chainInfo.chainId, 'done');

  return chainInfo;
}
