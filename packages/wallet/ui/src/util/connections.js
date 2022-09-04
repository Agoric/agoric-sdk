// @ts-check
/* global process */

export const SmartConnectionMethod = {
  READ_ONLY: 'readOnly',
  KEPLR: 'keplr',
};

const DEFAULT_CONNECTION_CONFIGS = [
  {
    href: 'http://localhost:8000/wallet/network-config',
  },
  {
    href: 'https://devnet.agoric.net/network-config',
  },
  {
    href: 'https://testnet.agoric.net/network-config',
  },
];

// TODO: Make mainnet unconditional.
if (process.env.NODE_ENV === 'development') {
  DEFAULT_CONNECTION_CONFIGS.push({
    href: 'https://main.agoric.net/network-config',
  });
}

export { DEFAULT_CONNECTION_CONFIGS };
