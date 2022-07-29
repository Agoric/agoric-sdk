/* global globalThis */
import { SigningStargateClient } from '@cosmjs/stargate';

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
    rpc = `http://${rpcAddr}`;
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
  await keplr.experimentalSuggestChain(chainInfo);
  await keplr.enable(chainId);

  const offlineSigner = keplr.getOfflineSigner(chainId);
  const cosmJS = await SigningClient.connectWithSigner(
    chainInfo.rpc,
    offlineSigner,
  );

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
          denom: 'uist',
        },
      ],
      gas: '890000',
    },
    'enjoy!',
  );
 */
  const accounts = await offlineSigner.getAccounts();

  return [cosmJS, accounts[0]?.address];
}
