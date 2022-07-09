// @ts-check
/* global process */

export const ConnectionConfigType = {
  SOLO: 'solo',
  SMART: 'smart',
};

export const SmartConnectionMethod = {
  READ_ONLY: 'readOnly',
  KEPLR: 'keplr',
};

const DEFAULT_CONNECTION_CONFIGS = [
  {
    type: ConnectionConfigType.SMART,
    href: 'http://localhost:8000/wallet/network-config',
  },
  {
    type: ConnectionConfigType.SMART,
    href: 'https://devnet.agoric.net/network-config',
  },
  {
    type: ConnectionConfigType.SMART,
    href: 'https://testnet.agoric.net/network-config',
  },
  {
    type: ConnectionConfigType.SOLO,
    href: 'http://localhost:8000',
  },
];

// TODO: Make mainnet unconditional.
if (process.env.NODE_ENV === 'development') {
  DEFAULT_CONNECTION_CONFIGS.push({
    type: ConnectionConfigType.SMART,
    href: 'https://main.agoric.net/network-config',
  });
}

export { DEFAULT_CONNECTION_CONFIGS };
