import { SigningStargateClient } from '@cosmjs/stargate';

export const AGORIC_COIN_TYPE = 564;
export const COSMOS_COIN_TYPE = 118;

export async function suggestChain(networkConfig, caption = undefined) {
  const coinType = Number(
    new URL(networkConfig).searchParams.get('coinType') || AGORIC_COIN_TYPE,
  );
  const res = await fetch(networkConfig, {
    headers: new Headers({ 'Content-Type': 'application/json' }),
  });
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
    const rpcHrefs = rpcAddrs.map(rpcAddr =>
      // Don't remove explicit port numbers from the URL, because the Cosmos
      // `--node=xxx` flag requires them (it doesn't just assume that
      // `--node=https://testnet.rpc.agoric.net` is the same as
      // `--node=https://testnet.rpc.agoric.net:443`)
      rpcAddr.includes('://') ? rpcAddr : `http://${rpcAddr}`,
    );

    rpc = rpcHrefs[Math.floor(Math.random() * rpcHrefs.length)];
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
  const cosmJS = await SigningStargateClient.connectWithSigner(
    rpc,
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
          denom: 'urun',
        },
      ],
      gas: '890000',
    },
    'enjoy!',
  );
 */

  return { client: cosmJS, signer: offlineSigner };
}
