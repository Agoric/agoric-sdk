// @ts-check
import { stakeCurrency, stableCurrency, bech32Config } from './chainInfo.js';

export const AGORIC_COIN_TYPE = 564;
export const COSMOS_COIN_TYPE = 118;

/**
 * @param {string} networkConfig URL
 * @param {object} addrs
 * @param {string} addrs.rpcAddr URL or origin
 * @param {string} addrs.apiAddr URL
 * @param {string} chainId
 * @param {string} [caption]
 * @returns {import('@keplr-wallet/types').ChainInfo}
 */
const makeChainInfo = (
  networkConfig,
  { rpcAddr, apiAddr },
  chainId,
  caption,
) => {
  const coinType = Number(
    new URL(networkConfig).searchParams.get('coinType') || AGORIC_COIN_TYPE,
  );
  const hostname = new URL(networkConfig).hostname;
  const network = hostname.split('.')[0];
  const rpc = rpcAddr.match(/:\/\//) ? rpcAddr : `http://${rpcAddr}`;

  return {
    rpc,
    rest: apiAddr,
    chainId,
    chainName: caption || `Agoric ${network}`,
    stakeCurrency,
    walletUrlForStaking: `https://${network}.staking.agoric.app`,
    bip44: {
      coinType,
    },
    bech32Config,
    currencies: [stakeCurrency, stableCurrency],
    feeCurrencies: [stableCurrency],
    features: ['stargate', 'ibc-transfer'],
  };
};

/**
 * @param {string} networkConfig URL
 * @param {object} io
 * @param {typeof fetch} io.fetch
 * @param {import('@keplr-wallet/types').Keplr} io.keplr
 * @param {typeof Math.random} io.random
 * @param {string} [caption]
 */
export async function suggestChain(
  networkConfig,
  { fetch, keplr, random },
  caption = undefined,
) {
  console.log('suggestChain: fetch', networkConfig); // log net IO
  const res = await fetch(networkConfig);
  if (!res.ok) {
    throw Error(`Cannot fetch network: ${res.status}`);
  }

  const { chainName: chainId, apiAddrs, rpcAddrs } = await res.json();
  assert.equal(apiAddrs.length, rpcAddrs.length);
  const index = Math.floor(random() * rpcAddrs.length);

  const rpcAddr = rpcAddrs[index];
  const apiAddr = apiAddrs[index];

  const chainInfo = makeChainInfo(
    networkConfig,
    { rpcAddr, apiAddr },
    chainId,
    caption,
  );
  console.log('chainInfo', chainInfo);
  await keplr.experimentalSuggestChain(chainInfo);
  await keplr.enable(chainId);
  console.log('keplr.enable chainId =', chainId, 'done');

  return chainInfo;
}
