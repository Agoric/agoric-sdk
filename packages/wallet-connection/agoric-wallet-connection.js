import { AgoricWalletConnection } from './src/AgoricWalletConnection.js';
import './src/agoric-iframe-messenger.js';

window.customElements.define(
  'agoric-wallet-connection',
  AgoricWalletConnection,
);
