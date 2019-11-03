import React from 'react';

import { makeStyles } from '@material-ui/core/styles';
import { Button, Chip } from '@material-ui/core';
import PersonIcon from '@material-ui/icons/Person';

import { useApplicationContext } from '../contexts/Application';
import { activateConnection, deactivateConnection } from '../store/actions';

const useStyles = makeStyles(theme => ({
  divider: {
    marginRight: theme.spacing(2),
  },
}));

export default function Web3Status() {
  const classes = useStyles();
  const { state, dispatch } = useApplicationContext();
  const { active, connected, account } = state;

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
        <Button variant="contained" onClick={handleConnect}>
          Connect
        </Button>
      )}
    </>
  );
}
