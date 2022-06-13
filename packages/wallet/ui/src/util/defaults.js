/* global process */

// TODO: Graduate to show mainnet in production.
const SHOW_MAINNET = process.env.NODE_ENV === 'development';
const localConnection = window.location.origin;
const stageConnections =
  process.env.NODE_ENV === 'development'
    ? ['https://stage.agoric.net/network-config']
    : [];
const netConnections = SHOW_MAINNET
  ? [
      'https://main.agoric.net/network-config',
      'https://devnet.agoric.net/network-config',
    ]
  : [];

export const DEFAULT_WALLET_CONNECTIONS = [
  localConnection,
  ...stageConnections,
  ...netConnections,
];
