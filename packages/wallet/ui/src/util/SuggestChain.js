import { SigningCosmosClient } from '@cosmjs/launchpad';

export const AGORIC_COIN_TYPE = 564;
export const COSMOS_COIN_TYPE = 118;
export const NETWORK_CONFIGS = [
  ['https://main.agoric.net/network-config', 'Agoric Mainnet'],
  ['https://testnet.agoric.net/network-config', 'Agoric Testnet'],
  ['https://devnet.agoric.net/network-config', 'Agoric Devnet'],
  ['https://stage.agoric.net/network-config', 'Agoric Stage'],
];

export async function suggestChain(networkConfig, caption = undefined) {
  const coinType = Number(
    new URL(networkConfig).searchParams.get('coinType') || AGORIC_COIN_TYPE,
  );
  const res = await fetch(networkConfig);
  if (!res.ok) {
    throw Error(`Cannot fetch network: ${res.status}`);
  }
  const { chainName: chainId, rpcAddrs } = await res.json();
  const hostname = new URL(networkConfig).hostname;
  const network = hostname.split('.')[0];
  let rpc;
  let api;
  if (network !== hostname) {
    rpc = `https://${network}.rpc.agoric.net`;
    api = `https://${network}.api.agoric.net`;
  } else {
    rpc = `http://${rpcAddrs[Math.floor(Math.random() * rpcAddrs.length)]}`;
    api = rpc.replace(/(:\d+)?$/, ':1317');
  }
  const stakeCurrency = {
    coinDenom: 'BLD',
    coinMinimalDenom: 'ubld',
    coinDecimals: 6,
    coinGeckoId: undefined,
  };
  const stableCurrency = {
    coinDenom: 'RUN',
    coinMinimalDenom: 'urun',
    coinDecimals: 6,
    coinGeckoId: undefined,
  };
  const chainInfo = {
    rpc,
    rest: api,
    chainId,
    chainName: caption || `Agoric ${network}`,
    stakeCurrency,
    walletUrlForStaking: `https://${network}.staking.agoric.app`,
    bip44: {
      coinType,
    },
    bech32Config: {
      bech32PrefixAccAddr: 'agoric',
      bech32PrefixAccPub: 'agoricpub',
      bech32PrefixValAddr: 'agoricvaloper',
      bech32PrefixValPub: 'agoricvaloperpub',
      bech32PrefixConsAddr: 'agoricvalcons',
      bech32PrefixConsPub: 'agoricvalconspub',
    },
    currencies: [stakeCurrency, stableCurrency],
    feeCurrencies: [stableCurrency],
    features: ['stargate', 'ibc-transfer'],
  };
  await window.keplr.experimentalSuggestChain(chainInfo);
  await window.keplr.enable(chainId);

  const offlineSigner = window.getOfflineSigner(chainId);
  const accounts = await offlineSigner.getAccounts();
  const cosmJS = new SigningCosmosClient(
    'https://node-cosmoshub-3.keplr.app/rest', // TODO: Provide correct rest API
    accounts[0].address,
    offlineSigner,
  );

  return cosmJS;
}
