import { makeFollower, makeLeader, makeCastingSpec } from '@agoric/casting';

import React, { useEffect, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';

import { observeIterator } from '@agoric/notifier';
import { withApplicationContext } from '../contexts/Application';
import { suggestChain } from '../util/SuggestChain';
import {
  makeBackendFromWalletBridge,
  makeWalletBridgeFromFollower,
} from '../util/WalletBackendAdapter';

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const SmartWalletConnection = ({
  walletConnection,
  setWalletConnection,
  setConnectionState,
  setBackend,
  setBackendErrorHandler,
}) => {
  const [snackbarMessages, setSnackbarMessages] = useState([]);

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
  const showReadOnlyError = (message, e) =>
    showError(`READ-ONLY: ${message} for write access`, e, 'warning');

  useEffect(() => {
    if (!walletConnection || !walletConnection.smartWalletAddress) {
      return () => {};
    }

    let cancelIterator;

    const followWallet = async () => {
      const { url, smartWalletAddress } = walletConnection;
      const walletSpec = `:published.wallet.${smartWalletAddress}`;

      const backendError = e => {
        showError('Error in wallet backend', e);
        setBackend(null);
        setConnectionState('error');
      };

      const leader = makeLeader(url);
      const castingSpec = makeCastingSpec(walletSpec);
      const follower = makeFollower(leader, castingSpec);
      const bridge = makeWalletBridgeFromFollower(follower, backendError);
      const { backendIt, cancel } = await makeBackendFromWalletBridge(bridge);
      cancelIterator = cancel;
      // Need to thunk the error handler, or it gets called immediately.
      setBackendErrorHandler(() => backendError);
      return observeIterator(backendIt, {
        updateState: be => {
          setBackend(be);
        },
        fail: backendError,
        finish: be => {
          setBackend(be);
        },
      });
    };
    followWallet().catch(e =>
      showError('Cannot read Smart Wallet state casting', e),
    );

    return () => {
      cancelIterator && cancelIterator();
    };
  }, [walletConnection]);

  useEffect(() => {
    if (!walletConnection) {
      return () => {};
    }
    let outdated;
    const connect = async () => {
      if (!window.getOfflineSigner || !window.keplr) {
        showReadOnlyError('Please install the Keplr extension');
      } else if (window.keplr.experimentalSuggestChain) {
        try {
          const { url } = walletConnection;
          const { client, signer } = await suggestChain(url);

          const setDefaultAddress = async () => {
            if (walletConnection.smartWalletAddress) {
              return;
            }
            const signerAccounts = await signer.getAccounts();
            if (walletConnection.smartWalletAddress) {
              return;
            }

            // We'll use the first available account for now.
            const { address: defaultAddress } = signerAccounts[0];
            setWalletConnection({
              ...walletConnection,
              smartWalletAddress: defaultAddress,
            });
          };

          await setDefaultAddress();

          // TODO: Would enable Keplr for transacting the Agoric client.
          console.log('Keplr client', client);
          showReadOnlyError('Transaction manager not implemented');
        } catch (e) {
          if (!outdated) {
            showReadOnlyError('Failed to connect to Keplr', e);
          }
        }
      } else {
        showReadOnlyError(
          'Please use the most recent version of the Keplr extension',
        );
      }
    };
    connect().catch(e => showReadOnlyError('Failed to connect to Keplr', e));

    return () => {
      outdated = true;
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
