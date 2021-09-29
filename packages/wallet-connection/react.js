import { createComponent } from '@lit-labs/react';

import { makeAgoricWalletConnection } from './index.js';

// Upgrade the tags.
import './agoric-wallet-connection.js';

export const makeReactAgoricWalletConnection = React =>
  createComponent(
    React,
    'agoric-wallet-connection',
    makeAgoricWalletConnection(),
    {
      onState: 'state',
    },
  );
