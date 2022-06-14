import React, { useEffect, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';

import { withApplicationContext } from '../contexts/Application';
import { suggestChain } from '../util/SuggestChain';

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const SmartWalletConnection = ({ walletConnection }) => {
  const [snackbarMessage, setSnackbarMessage] = useState(null);

  const handleSnackbarClose = (_, reason) => {
    if (reason === 'clickaway') {
      return;
    }

    setSnackbarMessage(null);
  };

  const showError = (message, e) => {
    if (e) {
      console.error(`${message}:`, e);
      message += `: ${e.message}`;
    }
    setSnackbarMessage(message);
  };

  useEffect(() => {
    if (!walletConnection) {
      return () => {};
    }
    let outdated;
    const connect = async () => {
      if (!window.getOfflineSigner || !window.keplr) {
        showError('Please install the Keplr extension');
      } else if (window.keplr.experimentalSuggestChain) {
        try {
          const client = await suggestChain(walletConnection.url);
          console.log('got stargate client', client);

          // TODO: Would enable Keplr for transacting the Agoric client.
          showError('Would enable transaction manager');
        } catch (e) {
          if (!outdated) {
            showError('Failed to connect to Keplr', e);
          }
        }
      } else {
        showError('Please use the most recent version of the Keplr extension');
      }
    };
    connect().catch(e => showError('Failed to connect to Keplr', e));

    return () => {
      outdated = true;
    };
  }, [walletConnection]);

  return (
    <div>
      <Snackbar
        open={snackbarMessage !== null}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="error"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default withApplicationContext(SmartWalletConnection, context => ({
  walletConnection: context.walletConnection,
  setConnectionState: context.setConnectionState,
  setWantConnection: context.setWantConnection,
}));
