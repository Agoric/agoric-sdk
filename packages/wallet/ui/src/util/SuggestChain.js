/* global globalThis */
import { SigningStargateClient } from '@cosmjs/stargate';
import { Random } from '@cosmjs/crypto';
import { makeLocalStorageSigner, makeOfferSigner } from './keyManagement.js';

export const AGORIC_COIN_TYPE = 564;
export const COSMOS_COIN_TYPE = 118;

export const stakeCurrency = {
  coinDenom: 'BLD',
  coinMinimalDenom: 'ubld',
  coinDecimals: 6,
  coinGeckoId: undefined,
};
export const stableCurrency = {
  coinDenom: 'RUN',
  coinMinimalDenom: 'urun',
  coinDecimals: 6,
  coinGeckoId: undefined,
};

export const bech32Config = {
  bech32PrefixAccAddr: 'agoric',
  bech32PrefixAccPub: 'agoricpub',
  bech32PrefixValAddr: 'agoricvaloper',
  bech32PrefixValPub: 'agoricvaloperpub',
  bech32PrefixConsAddr: 'agoricvalcons',
  bech32PrefixConsPub: 'agoricvalconspub',
};

const makeChainInfo = (networkConfig, rpcAddr, chainId, caption) => {
  console.log('@@makeChainInfo', { networkConfig });

  const coinType = Number(
    new URL(networkConfig).searchParams.get('coinType') || AGORIC_COIN_TYPE,
  );
  const hostname = new URL(networkConfig).hostname;
  const network = hostname.split('.')[0];
  let rpc;
  let api;
  console.log('@@makeChainInfo', { networkConfig, hostname, network, rpcAddr });
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
    SigningClient = SigningStargateClient,
    random = Math.random,
  } = io;

  const res = await fetch(networkConfig);
  if (!res.ok) {
    throw Error(`Cannot fetch network: ${res.status}`);
  }
  const { chainName: chainId, rpcAddrs } = await res.json();
  const rpcAddr = rpcAddrs[Math.floor(random() * rpcAddrs.length)];

  const chainInfo = makeChainInfo(networkConfig, rpcAddr, chainId, caption);
  console.log('@@SuggestChain', { networkConfig, chainInfo, keplr });
  await keplr.experimentalSuggestChain(chainInfo);
  await keplr.enable(chainId);
  console.log('@@keplr.enable', chainId, 'done');

  const offlineSigner = keplr.getOfflineSigner(chainId);
  // @@@@@ const cosmJS = await SigningClient.connectWithSigner(
  //   chainInfo.rpc,
  //   offlineSigner,
  // );
  let cosmJS;
  console.log('@@', { cosmJS });

  /*
  // Example transaction 
  const amount = {
    denom: 'ubld',
    amount: '1234567',
  };
  const accounts = await offlineSigner.getAccounts();
  await cosmJS.sendTokens(
    accounts[0].address,
    'agoric123456',
    [amount],
    {
      amount: [
        {
          amount: '500000',
          denom: 'urun',
        },
      ],
      gas: '890000',
    },
    'enjoy!',
  );
 */
  const accounts = await offlineSigner.getAccounts();

  console.log('@@SuggestChain', { chainInfo, accounts });
  const offerSigner = await makeOfferSigner(
    chainInfo,
    keplr,
    SigningClient.connectWithSigner,
  );

  const { getBytes } = Random;
  const localSigner = await makeLocalStorageSigner({ localStorage, getBytes });

  return [cosmJS, accounts[0]?.address, { offerSigner, localSigner }];
}
