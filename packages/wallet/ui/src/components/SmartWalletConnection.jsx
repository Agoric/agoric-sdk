// @ts-
import { makeFollower, makeLeader } from '@agoric/casting';

import React, { useEffect, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';

import { observeIterator } from '@agoric/notifier';
import { withApplicationContext } from '../contexts/Application';
import {
  makeBackendFromWalletBridge,
  makeWalletBridgeFromFollower,
} from '../util/WalletBackendAdapter';

const Alert = React.forwardRef(function Alert({ children, ...props }, ref) {
  return (
    <MuiAlert elevation={6} ref={ref} variant="filled" {...props}>
      {children}
    </MuiAlert>
  );
});

const SmartWalletConnection = ({
  walletConnection,
  setConnectionState,
  setBackend,
  setBackendErrorHandler,
}) => {
  const [snackbarMessages, setSnackbarMessages] = useState([]);
  setConnectionState('connecting');

  const handleSnackbarClose = (_, reason) => {
    if (reason === 'clickaway') {
      return;
    }

    setSnackbarMessages(sm => sm.slice(1));
  };

  const showError = (message, e, severity = 'error') => {
    if (e) {
      console.error(`${message}:`, e);
      message += `: ${e.message}`;
    }
    if (severity === 'error') {
      setConnectionState('error');
    }
    setSnackbarMessages(sm => [...sm, { severity, message }]);
  };

  useEffect(() => {
    if (!walletConnection) {
      return undefined;
    }

    let cancelIterator;
    const follow = async () => {
      console.log('following');
      const { url, smartWalletAddress } = walletConnection;

      const backendError = e => {
        showError('Error in wallet backend', e);
        setBackend(null);
        setConnectionState('error');
      };

      const leader = makeLeader(url);
      const follower = makeFollower(
        leader,
        ({ clientParams: { address } }) => `:published.wallet.${address}`,
        { clientParams: { address: smartWalletAddress ?? undefined } },
      );
      const bridge = makeWalletBridgeFromFollower(follower, backendError, () =>
        setConnectionState('bridged'),
      );
      const { backendIt, cancel } = await makeBackendFromWalletBridge(bridge);
      cancelIterator = cancel;
      // Need to thunk the error handler, or it gets called immediately.
      setBackendErrorHandler(() => backendError);
      return observeIterator(backendIt, {
        updateState: be => {
          cancelIterator && setBackend(be);
        },
        fail: e => {
          cancelIterator && backendError(e);
        },
        finish: be => {
          cancelIterator && setBackend(be);
        },
      });
    };
    follow().catch(e => showError('Cannot read Smart Wallet casting', e));

    return () => {
      cancelIterator && cancelIterator();
      cancelIterator = undefined;
    };
  }, [walletConnection]);

  return (
    <div>
      <Snackbar open={snackbarMessages.length > 0}>
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarMessages[0]?.severity}
          sx={{ width: '100%' }}
        >
          {snackbarMessages[0]?.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default withApplicationContext(SmartWalletConnection, context => ({
  walletConnection: context.walletConnection,
  setWalletConnection: context.setWalletConnection,
  setConnectionState: context.setConnectionState,
  setBackend: context.setBackend,
  setBackendErrorHandler: context.setBackendErrorHandler,
}));
