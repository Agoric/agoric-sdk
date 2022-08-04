/* global globalThis */

import { stakeCurrency, stableCurrency, bech32Config } from './chainInfo.js';

export const AGORIC_COIN_TYPE = 564;
export const COSMOS_COIN_TYPE = 118;

const makeChainInfo = (networkConfig, rpcAddr, chainId, caption) => {
  const coinType = Number(
    new URL(networkConfig).searchParams.get('coinType') || AGORIC_COIN_TYPE,
  );
  const hostname = new URL(networkConfig).hostname;
  const network = hostname.split('.')[0];
  let rpc;
  let api;

  if (network !== hostname) {
    rpc = `https://${network}.rpc.agoric.net`;
    api = `https://${network}.api.agoric.net`;
  } else {
    rpc = rpcAddr.match(/:\/\//) ? rpcAddr : `http://${rpcAddr}`;
    api = rpc.replace(/(:\d+)?$/, ':1317');
  }

  return {
    rpc,
    rest: api,
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

export async function suggestChain(
  networkConfig,
  /** @type {string} */ caption = undefined,
  io = {},
) {
  const {
    fetch = globalThis.fetch,
    keplr = window.keplr,
    random = Math.random,
  } = io;

  console.log('suggestChain: fetch', networkConfig); // log net IO
  const res = await fetch(networkConfig);
  if (!res.ok) {
    throw Error(`Cannot fetch network: ${res.status}`);
  }
  const { chainName: chainId, rpcAddrs } = await res.json();
  const rpcAddr = rpcAddrs[Math.floor(random() * rpcAddrs.length)];

  const chainInfo = makeChainInfo(networkConfig, rpcAddr, chainId, caption);
  await keplr.experimentalSuggestChain(chainInfo);
  await keplr.enable(chainId);
  console.log('keplr.enable chainId =', chainId, 'done');

  return chainInfo;
}
