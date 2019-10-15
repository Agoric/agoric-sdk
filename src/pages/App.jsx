import React from 'react';

import { makeStyles } from '@material-ui/core/styles';
import { CssBaseline } from '@material-ui/core';

import Header from '../components/Header';
import Game from '../components/Game';

const useStyles = makeStyles(theme => ({
  layout: {
    width: 'auto',
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
    [theme.breakpoints.up(600 + theme.spacing(2) * 2)]: {
      width: 600,
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
      <Header />
      <main className={classes.layout}>
        <Game />
      </main>
    </>
  );
}
