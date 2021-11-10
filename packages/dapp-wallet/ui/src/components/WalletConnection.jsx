/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable react/display-name */
import { makeReactAgoricWalletConnection } from '@agoric/wallet-connection/react.js';
import React, { useCallback } from 'react';
import clsx from 'clsx';
import { E } from '@agoric/eventual-send';
import { observeNotifier } from '@agoric/notifier';
import { makeStyles } from '@material-ui/core/styles';
import IconButton from '@material-ui/core/IconButton';
import Public from '@material-ui/icons/Public';
import Tooltip from '@material-ui/core/Tooltip';

import { withApplicationContext } from '../contexts/Application';

const useStyles = makeStyles(_ => ({
  hidden: {
    display: 'none',
  },
  connector: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
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
  setConnectionState,
  connectionState,
  setInbox,
  setPurses,
  setDapps,
  setContacts,
  setPayments,
  setIssuers,
  setWalletBridge,
}) => {
  const classes = useStyles();
  const onWalletState = useCallback(ev => {
    const { walletConnection, state } = ev.detail;
    console.log('onWalletState', state);
    setConnectionState(state);
    switch (state) {
      case 'idle': {
        // This is one of the only methods that the wallet connection facet allows.
        // It connects asynchronously, but you can use promise pipelining immediately.
        /** @type {ERef<WalletBridge>} */
        const bridge = E(walletConnection).getAdminBootstrap(getAccessToken());
        // You should reconstruct all state here.
        console.log('Got bridge', bridge);
        setWalletBridge(bridge);
        observeNotifier(E(bridge).getOffersNotifier(), {
          updateState: setInbox,
        });
        observeNotifier(E(bridge).getPursesNotifier(), {
          updateState: setPurses,
        });
        observeNotifier(E(bridge).getDappsNotifier(), {
          updateState: setDapps,
        });
        observeNotifier(E(bridge).getContactsNotifier(), {
          updateState: setContacts,
        });
        observeNotifier(E(bridge).getPaymentsNotifier(), {
          updateState: setPayments,
        });
        observeNotifier(E(bridge).getIssuersNotifier(), {
          updateState: setIssuers,
        });
        break;
      }
      case 'error': {
        console.log('error', ev.detail);
        // In case of an error, reset to 'idle'.
        // Backoff or other retry strategies would go here instead of immediate reset.
        E(walletConnection).reset();
        break;
      }
      default:
    }
  }, []);

  return (
    <div className={clsx('connector', classes.connector)}>
      <Tooltip
        title={connectionState === 'bridged' ? 'Connected' : 'Disconnected'}
      >
        <IconButton
          size="medium"
          color={connectionState === 'bridged' ? 'primary' : 'secondary'}
        >
          <Public fontSize="inherit">{connectionState}</Public>
        </IconButton>
      </Tooltip>
      <AgoricWalletConnection
        onState={onWalletState}
        className={classes.hidden}
      />
    </div>
  );
};

export default withApplicationContext(WalletConnection, context => ({
  setConnectionState: context.setConnectionState,
  connectionState: context.connectionState,
  setWalletBridge: context.setWalletBridge,
  setInbox: context.setInbox,
  setPurses: context.setPurses,
  setDapps: context.setDapps,
  setContacts: context.setContacts,
  setPayments: context.setPayments,
  setIssuers: context.setIssuers,
}));
