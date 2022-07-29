// @ts-check

/** @type {import('@keplr-wallet/types').Currency} */
export const stakeCurrency = {
  coinDenom: 'BLD',
  coinMinimalDenom: 'ubld',
  coinDecimals: 6,
  coinGeckoId: undefined,
};
/** @type {import('@keplr-wallet/types').Currency} */
export const stableCurrency = {
  coinDenom: 'RUN',
  coinMinimalDenom: 'urun',
  coinDecimals: 6,
  coinGeckoId: undefined,
};

/** @type {import('@keplr-wallet/types').Bech32Config} */
export const bech32Config = {
  bech32PrefixAccAddr: 'agoric',
  bech32PrefixAccPub: 'agoricpub',
  bech32PrefixValAddr: 'agoricvaloper',
  bech32PrefixValPub: 'agoricvaloperpub',
  bech32PrefixConsAddr: 'agoricvalcons',
  bech32PrefixConsPub: 'agoricvalconspub',
};
