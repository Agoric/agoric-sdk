import React from 'react';

import { makeStyles } from '@material-ui/core/styles';
import { AppBar, Link, Toolbar, Typography } from '@material-ui/core';
import WalletIcon from '@material-ui/icons/AccountBalanceWallet';

const useStyles = makeStyles(theme => ({
  appBar: {
    position: 'relative',
  },
  title: {
    flexGrow: 1,
  },
  icon: {
    marginRight: theme.spacing(1),
  },
}));

// eslint-disable-next-line react/prop-types
export default function Header({ children }) {
  const classes = useStyles();

  return (
    <AppBar position="absolute" className={classes.appBar}>
      <Toolbar>
        <WalletIcon className={classes.icon} />
        <Typography
          variant="h6"
          color="inherit"
          noWrap
          className={classes.title}
        >
          <Link color="inherit" target="_blank" href="https://agoric.com">Agoric Wallet</Link>
        </Typography>
        {children}
      </Toolbar>
    </AppBar>
  );
}
