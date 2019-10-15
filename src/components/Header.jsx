import React from 'react';

import { makeStyles } from '@material-ui/core/styles';
import { AppBar, Toolbar, Typography } from '@material-ui/core';

const useStyles = makeStyles(() => ({
  appBar: {
    position: 'relative',
  },
  title: {
    flexGrow: 1,
  },
}));

export default function Header({ children }) {
  const classes = useStyles();

  return (
    <AppBar position="absolute" className={classes.appBar}>
      <Toolbar>
        <Typography
          variant="h6"
          color="inherit"
          noWrap
          className={classes.title}
        >
          Wallet
        </Typography>
        {children}
      </Toolbar>
    </AppBar>
  );
}
