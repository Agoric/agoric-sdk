/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable react/display-name */
import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { makeStyles } from '@mui/styles';
import LoadingButton from '@mui/lab/LoadingButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';

import { NETWORK_CONFIGS, suggestChain } from '../util/SuggestChain';

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
  centeredText: {
    textAlign: 'center',
  },
  dialog: {
    minWidth: 240,
  },
}));

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const ChainConnector = () => {
  const classes = useStyles();
  const [dialogOpened, setDialogOpened] = useState(false);
  const [networkConfig, setNetworkConfig] = useState(null);
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

  const handleClose = () => {
    setDialogOpened(false);
  };

  const selectNetworkConfig = nc => {
    setNetworkConfig(nc);
    setDialogOpened(false);
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
        showError('Please install the Keplr extension');
      } else if (window.keplr.experimentalSuggestChain) {
        try {
          const cosmJS = await suggestChain(networkConfig[0]);
          if (!networkChanged) {
            setConnectionInProgress(false);
            window.cosmJS = cosmJS;
          }
        } catch (e) {
          if (!networkChanged) {
            showError('Failed to connect to Keplr');
            console.error(e);
            setConnectionInProgress(false);
            setNetworkConfig(null);
          }
        }
      } else {
        setNetworkConfig(null);
        showError('Please use the most recent version of the Keplr extension');
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
      <Dialog onClose={handleClose} open={dialogOpened}>
        <div className={classes.dialog}>
          <DialogTitle className={classes.centeredText}>
            Select Network
          </DialogTitle>
          <List sx={{ pt: 0 }}>
            {NETWORK_CONFIGS.map(nc => (
              <ListItem
                button
                selected={nc === networkConfig}
                onClick={() => selectNetworkConfig(nc)}
                key={nc[0]}
              >
                <ListItemText
                  className={classes.centeredText}
                  primary={nc[1]}
                />
              </ListItem>
            ))}
          </List>
        </div>
      </Dialog>
      <Snackbar
        open={snackbarMessage}
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

export default ChainConnector;
