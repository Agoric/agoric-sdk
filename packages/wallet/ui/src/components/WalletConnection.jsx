// @ts-check
/* eslint-disable no-underscore-dangle */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable react/display-name */
import { makeReactAgoricWalletConnection } from '@agoric/wallet-connection/react.js';
import React, { useState, useEffect } from 'react';
import { E } from '@endo/eventual-send';
import { observeIterator } from '@agoric/notifier';
import { makeStyles } from '@mui/styles';

import { withApplicationContext } from '../contexts/Application.jsx';
import { makeBackendFromWalletBridge } from '../util/WalletBackendAdapter.js';
import { makeFixedWebSocketConnector } from '../util/fixed-websocket-connector.js';
import { bridgeStorageMessages } from '../util/BridgeStorage.js';

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
  connectionConfig,
}) => {
  const classes = useStyles();
  /**
   * TODO: where to get the full types for these?
   *
   * @typedef {{
   *   getAdminBootstrap: (accessToken: any, makeConnector?: any) => WalletBridge
   * }} WalletConnection
   * @typedef {{
   *   getScopedBridge: (suggestedDappPetname: unknown, dappOrigin?: unknown, makeConnector?: unknown) => unknown
   * }} WalletBridge
   */
  const [wc, setWC] = useState(/** @type {WalletConnection|null} */ (null));

  let cancelled = null;
  const onWalletState = ev => {
    if (cancelled) {
      return;
    }
    const { walletConnection: newWC, state } = ev.detail;
    setConnectionState(state);
    if (!wc) {
      setWC(newWC);
    }
  };

  useEffect(() => {
    if (!wc) {
      return () => {};
    }
    const bridge = E(wc).getAdminBootstrap(
      connectionConfig.accessToken,
      makeFixedWebSocketConnector(connectionConfig.href),
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

    const cleanupStorageBridge = bridgeStorageMessages(bridge);

    return () => {
      cancelled = true;
      cleanupStorageBridge();
      disconnect();
      cancel();
    };
  }, [wc]);

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
  connectionConfig: context.connectionConfig,
}));
