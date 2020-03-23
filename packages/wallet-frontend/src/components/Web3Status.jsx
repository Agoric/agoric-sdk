import React, { useEffect } from 'react';

import { makeStyles } from '@material-ui/core/styles';
import { Button, Chip } from '@material-ui/core';
import PersonIcon from '@material-ui/icons/Person';

import { useApplicationContext } from '../contexts/Application';
import { activateConnection, deactivateConnection } from '../store/actions';

const useStyles = makeStyles(theme => ({
  divider: {
    marginRight: theme.spacing(2),
  },
  pulse: {
    animation: '$pulse 1.5s ease-in-out 0.5s infinite',
  },
  '@keyframes pulse': {
    '0%': {
      opacity: 1,
    },
    '50%': {
      opacity: 0.4,
    },
    '100%': {
      opacity: 1,
    },
  },
}));

export default function Web3Status() {
  const classes = useStyles();
  const { state, dispatch } = useApplicationContext();
  const { active, connected, account } = state;

  // Automatically connect to the wallet.
  useEffect(() => dispatch(activateConnection()), [dispatch]);

  function handleConnect() {
    dispatch(activateConnection());
  }

  function handleDisconnect() {
    dispatch(deactivateConnection());
  }

  return (
    <>
      {connected && (
        <Chip
          className={classes.divider}
          label={account || 'anonymous'}
          avatar={<PersonIcon />}
        />
      )}
      {active ? (
        <Button variant="contained" onClick={handleDisconnect}>
          Disconnect
        </Button>
      ) : (
        <Button variant="contained" onClick={handleConnect} className={classes.pulse}>
          Connect
        </Button>
      )}
    </>
  );
}
