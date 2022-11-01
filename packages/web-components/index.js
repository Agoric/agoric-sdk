// @ts-check

// Ambient types. https://github.com/Agoric/agoric-sdk/issues/6512
import '@agoric/swingset-vat/src/vats/network/types.js';

export { AgoricWalletConnection } from './src/AgoricWalletConnection.js';
export { makeAgoricKeplrConnection } from './src/keplr-connection/KeplrConnection.js';
export { Errors as AgoricKeplrConnectionErrors } from './src/keplr-connection/errors.js';
export {
  DappWalletBridge,
  BridgeProtocol,
} from './src/dapp-wallet-bridge/DappWalletBridge.js';
