/* eslint-disable no-underscore-dangle */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable react/display-name */
import { makeReactAgoricWalletConnection } from '@agoric/wallet-connection/react.js';
import React, { useState, useCallback, useEffect } from 'react';
import { E } from '@endo/eventual-send';
import { observeIterator } from '@agoric/notifier';
import { makeStyles } from '@mui/styles';

import { withApplicationContext } from '../contexts/Application.jsx';

import { makeBackendFromWalletBridge } from '../util/WalletBackendAdapter.js';
import { makeFixedWebSocketConnector } from '../util/fixed-websocket-connector.js';

const useStyles = makeStyles(_ => ({
  hidden: {
    display: 'none',
  },
}));

// Create a wrapper for agoric-wallet-connection that is specific to
// the app's instance of React.
const AgoricWalletConnection = makeReactAgoricWalletConnection(React);

const WalletConnection = ({
  setBackend,
  setConnectionState,
  disconnect,
  walletConnection,
}) => {
  const classes = useStyles();
  const [wc, setWC] = useState(null);

  let cancelled = null;
  const onWalletState = useCallback(
    ev => {
      if (cancelled) {
        return;
      }
      const { walletConnection: newWC, state } = ev.detail;
      setConnectionState(state);
      if (!wc) {
        setWC(newWC);
      }
    },
    [walletConnection],
  );

  useEffect(() => {
    if (!wc || !walletConnection || !walletConnection.accessToken) {
      return () => {};
    }

    const bridge = E(wc).getAdminBootstrap(
      walletConnection.accessToken,
      makeFixedWebSocketConnector(walletConnection.url),
    );

    const { backendIt, cancel } = makeBackendFromWalletBridge(bridge);
    const rethrowIfNotCancelled = e => {
      if (!cancelled) {
        throw e;
      }
    };

    observeIterator(backendIt, {
      updateState: be => {
        if (cancelled) {
          throw Error('cancelled');
        }
        setBackend(be);
      },
    }).catch(rethrowIfNotCancelled);

    return () => {
      cancelled = true;
      disconnect();
      cancel();
    };
  }, [wc, walletConnection]);

  return (
    <AgoricWalletConnection
      onState={onWalletState}
      className={classes.hidden}
    />
  );
};

export default withApplicationContext(WalletConnection, context => ({
  setConnectionState: context.setConnectionState,
  disconnect: context.disconnect,
  setBackend: context.setBackend,
  walletConnection: context.walletConnection,
}));
