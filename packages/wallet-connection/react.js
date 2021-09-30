import { createComponent } from '@lit-labs/react';

import { AgoricWalletConnection } from './index.js';

// Upgrade the tags.
import './agoric-wallet-connection.js';

export const makeReactAgoricWalletConnection = React =>
  createComponent(React, 'agoric-wallet-connection', AgoricWalletConnection, {
    onState: 'state',
  });
