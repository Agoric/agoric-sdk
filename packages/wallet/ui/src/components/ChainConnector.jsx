/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable react/display-name */
import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { makeStyles } from '@mui/styles';
import LoadingButton from '@mui/lab/LoadingButton';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';

import { withApplicationContext } from '../contexts/Application';

const useStyles = makeStyles(_ => ({
  connector: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
}));

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const ChainConnector = ({
  networkConfig,
  setNetworkConfig,
  setDialogOpened,
  tryKeplrConnect,
}) => {
  const classes = useStyles();
  const [connectionInProgress, setConnectionInProgress] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState(null);

  const handleSnackbarClose = (_, reason) => {
    if (reason === 'clickaway') {
      return;
    }

    setSnackbarMessage(null);
  };

  const showError = message => {
    setSnackbarMessage(message);
  };

  useEffect(() => {
    if (!networkConfig) {
      return () => {};
    }

    let networkChanged = false;
    setConnectionInProgress(true);

    const connect = async () => {
      if (!window.getOfflineSigner || !window.keplr) {
        setNetworkConfig(null);
        setConnectionInProgress(false);
        showError('Please install the Keplr extension');
        return;
      } else if (!window.keplr.experimentalSuggestChain) {
        setNetworkConfig(null);
        showError('Please use the most recent version of the Keplr extension');
        return;
      }
      try {
        tryKeplrConnect();
        if (!networkChanged) {
          setConnectionInProgress(false);
        }
      } catch (e) {
        if (!networkChanged) {
          showError('Failed to connect to Keplr');
          console.error(e);
          setConnectionInProgress(false);
          setNetworkConfig(null);
        }
      }
    };
    connect();

    return () => {
      networkChanged = true;
    };
  }, [networkConfig]);

  return (
    <>
      <div className={clsx('Connector', classes.connector)}>
        <LoadingButton
          loading={connectionInProgress}
          color="primary"
          variant="outlined"
          onClick={() => setDialogOpened(true)}
        >
          {networkConfig ? 'Connected' : 'Connect Wallet'}
        </LoadingButton>
      </div>
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
    </>
  );
};

export default withApplicationContext(ChainConnector, context => ({
  networkConfig: context.networkConfig,
  setNetworkConfig: context.setNetworkConfig,
  tryKeplrConnect: context.tryKeplrConnect,
}));
