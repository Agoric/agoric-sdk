import { createComponent } from '@lit-labs/react';

import { AgoricWalletConnection, DappWalletBridge } from './index.js';

// Upgrade the tags.
import './agoric-wallet-connection.js';
import './dapp-wallet-bridge.js';

export const makeReactAgoricWalletConnection = React =>
  createComponent(React, 'agoric-wallet-connection', AgoricWalletConnection, {
    onState: 'state',
  });

export const makeReactDappWalletBridge = React =>
  createComponent(React, 'dapp-wallet-bridge', DappWalletBridge, {
    onBridgeMessage: 'bridgeMessage',
    onError: 'error',
    onBridgeReady: 'bridgeReady',
  });
