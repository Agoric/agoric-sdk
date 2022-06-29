// @ts-check
/* global process */

export const ConnectionConfigType = {
  Solo: 'solo',
  Smart: 'smart',
};

const DEFAULT_CONNECTION_CONFIGS = [
  {
    type: ConnectionConfigType.Smart,
    href: 'https://devnet.agoric.net/network-config',
  },
  {
    type: ConnectionConfigType.Smart,
    href: 'https://testnet.agoric.net/network-config',
  },
  {
    type: ConnectionConfigType.Solo,
    href: 'http://localhost:8000',
  },
];

// TODO: Make mainnet unconditional.
if (process.env.NODE_ENV === 'development') {
  DEFAULT_CONNECTION_CONFIGS.push({
    type: ConnectionConfigType.Smart,
    href: 'https://main.agoric.net/network-config',
  });
}

export { DEFAULT_CONNECTION_CONFIGS };
