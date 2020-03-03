import React from 'react';

import { makeStyles } from '@material-ui/core/styles';
import { AppBar, Toolbar, Typography } from '@material-ui/core';
import ExchangeIcon from '@material-ui/icons/ShuffleRounded';

const useStyles = makeStyles(theme => ({
  appBar: {
    position: 'relative',
    backgroundColor: '#202123',
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
    <AppBar position="absolute" elevation={0} className={classes.appBar}>
      <Toolbar>
        <ExchangeIcon className={classes.icon} />
        <Typography
          variant="h6"
          color="inherit"
          noWrap
          className={classes.title}
        >
          Simple Exchange
        </Typography>
        {children}
      </Toolbar>
    </AppBar>
  );
}
