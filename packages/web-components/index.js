// @ts-check

// Ambient types. https://github.com/Agoric/agoric-sdk/issues/6512
import '@agoric/swingset-vat/src/vats/network/types.js';
import '@agoric/governance/src/types-ambient.js';

export { AgoricWalletConnection } from './src/AgoricWalletConnection.js';
export { makeAgoricKeplrConnection } from './src/keplr-connection/KeplrConnection.js';
export { makeAgoricWalletConnection } from './src/wallet-connection/walletConnection.js';
export { Errors as AgoricKeplrConnectionErrors } from './src/errors.js';

export {
  DappWalletBridge,
  BridgeProtocol,
} from './src/dapp-wallet-bridge/DappWalletBridge.js';
