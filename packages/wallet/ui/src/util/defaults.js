/* global process */

// TODO: Graduate to show mainnet in production.
const SHOW_MAINNET = process.env.NODE_ENV === 'development';
const localSoloConnection =
  window && window.location.hostname !== 'localhost'
    ? { label: window.location.hostname, url: window.location.origin }
    : { label: 'Local Solo', url: 'http://localhost:8000' };
const localChain = {
  label: 'Local Chain',
  url: new URL(
    `${process.env.PUBLIC_URL || ''}/network-config`,
    window.location,
  ).href,
};
const stageConnections =
  process.env.NODE_ENV === 'development' || !SHOW_MAINNET
    ? [
        {
          label: 'Agoric Devnet',
          url: 'https://devnet.agoric.net/network-config',
        },
        {
          label: 'Agoric Stage',
          url: 'https://stage.agoric.net/network-config',
        },
      ]
    : [];
const netConnections = SHOW_MAINNET
  ? [
      {
        label: 'Agoric Mainnet',
        url: 'https://main.agoric.net/network-config',
      },
    ]
  : [];

export const DEFAULT_WALLET_CONNECTIONS = harden([
  localSoloConnection,
  localChain,
  ...stageConnections,
  ...netConnections,
]);
