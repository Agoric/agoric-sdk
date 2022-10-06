// @ts-check

export const KnownNetworkConfigUrls = {
  main: 'https://main.agoric.net/network-config',
  devnet: 'https://devnet.agoric.net/network-config',
  testnet: 'https://testnet.agoric.net/network-config',
  // for localhost skip https and assume it's subpathed to /wallet
  localhost: 'http://localhost:8000/wallet/network-config',
};

export const DEFAULT_CONNECTION_CONFIGS = Object.values(
  KnownNetworkConfigUrls,
).map(href => ({ href }));

export const networkConfigUrl = {
  fromSource(source) {
    return KnownNetworkConfigUrls[source];
  },
  toSource(href) {
    const matchingEntry = Object.entries(KnownNetworkConfigUrls).find(
      ([_, url]) => url === href,
    );
    if (matchingEntry) {
      return matchingEntry[0];
    }
    return 'custom';
  },
};
