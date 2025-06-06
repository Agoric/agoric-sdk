export const networkConfigs = {
  devnet: {
    label: 'Agoric Devnet',
    url: 'https://devnet.agoric.net/network-config',
    rpc: 'https://devnet.rpc.agoric.net',
    api: 'https://devnet.api.agoric.net',
    chainId: 'agoricdev-25',
  },
  emerynet: {
    label: 'Agoric Emerynet',
    url: 'https://emerynet.agoric.net/network-config',
    rpc: 'https://emerynet.rpc.agoric.net',
    api: 'https://emerynet.api.agoric.net',
    chainId: 'agoric-emerynet-9',
  },
  localhost: {
    label: 'Local Network',
    url: 'https://local.agoric.net/network-config',
    rpc: 'http://localhost:26657',
    api: 'http://localhost:1317',
    chainId: 'agoriclocal',
  },
};

export const EVM_CHAINS = {
  Avalanche: 'Avalanche',
  Base: 'base-sepolia',
  Ethereum: 'ethereum-sepolia',
};
