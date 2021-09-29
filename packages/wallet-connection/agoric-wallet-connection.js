import { makeAgoricWalletConnection } from './src/agoric-wallet-connection.js';

window.customElements.define(
  'agoric-wallet-connection',
  makeAgoricWalletConnection(),
);
