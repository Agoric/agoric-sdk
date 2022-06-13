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

const useStyles = makeStyles(_ => ({
  hidden: {
    display: 'none',
  },
}));

// Create a wrapper for agoric-wallet-connection that is specific to
// the app's instance of React.
const AgoricWalletConnection = makeReactAgoricWalletConnection(React);

const getAccessToken = () => {
  // Fetch the access token from the window's URL.
  let accessTokenParams = `?${window.location.hash.slice(1)}`;
  let accessToken = new URLSearchParams(accessTokenParams).get('accessToken');

  try {
    if (accessToken) {
      // Store the access token for later use.
      window.localStorage.setItem('accessTokenParams', accessTokenParams);
    } else {
      // Try reviving it from localStorage.
      accessTokenParams =
        window.localStorage.getItem('accessTokenParams') || '?';
      accessToken = new URLSearchParams(accessTokenParams).get('accessToken');
    }
  } catch (e) {
    console.log('Error fetching accessTokenParams', e);
  }

  // Now that we've captured it, clear out the access token from the URL bar.
  window.location.hash = '';

  window.addEventListener('hashchange', _ev => {
    // See if we should update the access token params.
    const atp = `?${window.location.hash.slice(1)}`;
    const at = new URLSearchParams(atp).get('accessToken');

    if (at) {
      // We have new params, so replace them.
      accessTokenParams = atp;
      accessToken = at;
      localStorage.setItem('accessTokenParams', accessTokenParams);
    }

    // Keep it clear.
    window.location.hash = '';
  });

  return accessToken;
};

const WalletConnection = ({
  setBackend,
  setConnectionState,
  disconnect,
  walletConnection,
}) => {
  const classes = useStyles();
  const [wc, setWC] = useState(null);

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
      getAccessToken(),
      makeFixedWebSocketConnector(walletConnection),
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
  walletConnection: context.walletConnection,
}));
