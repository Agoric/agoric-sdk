import React from 'react';

import { makeStyles } from '@material-ui/core/styles';
import { CssBaseline } from '@material-ui/core';

import Header from '../components/Header';
import Web3Status from '../components/Web3Status';
import Swap from '../components/Swap';

const useStyles = makeStyles(theme => ({
  layout: {
    width: 'auto',
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
    [theme.breakpoints.up(800 + theme.spacing(2) * 2)]: {
      width: 800,
      marginLeft: 'auto',
      marginRight: 'auto',
    },
  },
}));

export default function App() {
  const classes = useStyles();

  return (
    <>
      <CssBaseline />
      <Header>
        <Web3Status />
      </Header>
      <main className={classes.layout}>
        <Swap />
      </main>
    </>
  );
}
