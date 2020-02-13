import React from 'react';

import { makeStyles } from '@material-ui/core/styles';
import { AppBar, Toolbar, Typography } from '@material-ui/core';
import AutoswapIcon from '@material-ui/icons/SwapHorizontalCircle';

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

export default function Header({ children }) {
  const classes = useStyles();

  return (
    <AppBar position="absolute" className={classes.appBar}>
      <Toolbar>
        <AutoswapIcon className={classes.icon} />
        <Typography
          variant="h6"
          color="inherit"
          noWrap
          className={classes.title}
        >
          AutoSwap Exchange
        </Typography>
        {children}
      </Toolbar>
    </AppBar>
  );
}
