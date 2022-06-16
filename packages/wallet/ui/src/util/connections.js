// @ts-check
/* global process */

export const WalletBackend = harden({
  Solo: 'solo',
  Smart: 'smart',
});

const DEFAULT_WALLET_CONNECTIONS = [
  {
    label: 'Agoric Devnet',
    backend: WalletBackend.Smart,
    url: 'https://devnet.agoric.net/network-config',
  },
  {
    label: 'Agoric Testnet',
    backend: WalletBackend.Smart,
    url: 'https://testnet.agoric.net/network-config',
  },
  {
    label: 'Local Solo',
    backend: WalletBackend.Solo,
    url: 'http://localhost:8000',
  },
  {
    label: 'Local Chain',
    backend: WalletBackend.Smart,
    url: new URL(
      `${process.env.PUBLIC_URL || ''}/network-config`,
      window.location,
    ).href,
  },
];

// TODO: Make mainnet unconditional.
if (process.env.NODE_ENV === 'development') {
  DEFAULT_WALLET_CONNECTIONS.push({
    label: 'Agoric Mainnet',
    backend: WalletBackend.Smart,
    url: 'https://main.agoric.net/network-config',
  });
}

if (window && window.location.hostname !== 'localhost') {
  DEFAULT_WALLET_CONNECTIONS.unshift({
    label: window.location.hostname,
    backend: WalletBackend.Solo,
    url: window.location.origin,
  });
}

harden(DEFAULT_WALLET_CONNECTIONS);
export { DEFAULT_WALLET_CONNECTIONS };
