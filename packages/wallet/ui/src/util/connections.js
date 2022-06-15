/* global process */

const DEFAULT_WALLET_CONNECTIONS = [
  { label: 'Local Solo', url: 'http://localhost:8000' },
  {
    label: 'Local Chain',
    url: new URL(
      `${process.env.PUBLIC_URL || ''}/network-config`,
      window.location,
    ).href,
  },
  {
    label: 'Agoric Devnet',
    url: 'https://devnet.agoric.net/network-config',
  },
];

// TODO: Make mainnet unconditional.
if (process.env.NODE_ENV === 'development') {
  DEFAULT_WALLET_CONNECTIONS.push({
    label: 'Agoric Mainnet',
    url: 'https://main.agoric.net/network-config',
  });
}

if (window && window.location.hostname !== 'localhost') {
  DEFAULT_WALLET_CONNECTIONS.unshift({
    label: window.location.hostname,
    url: window.location.origin,
  });
}

harden(DEFAULT_WALLET_CONNECTIONS);
export { DEFAULT_WALLET_CONNECTIONS };
