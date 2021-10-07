/* eslint-disable react/display-name */
import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { CssBaseline } from '@material-ui/core';
import {
  createTheme,
  makeStyles,
  ThemeProvider,
} from '@material-ui/core/styles';

import AppBar from './components/AppBar';
import NavMenu from './components/NavMenu';
import Contacts from './views/Contacts.js';
import Dapps from './views/Dapps.js';
import Dashboard from './views/Dashboard.js';
import Purses from './views/Purses.js';
import Issuers from './views/Issuers.js';

const appBarHeight = '64px';
const navMenuWidth = '240px';

const appTheme = createTheme({
  palette: {
    background: {
      default: '#ffffff',
    },
  },
  typography: {
    fontFamily: ['"Roboto"', '"Helvetica"', '"Arial"', 'sans-serif'].join(','),
    fontWeightRegular: 500,
    h1: {
      fontFamily: ['"Montserrat"', '"Arial"', 'sans-serif'].join(','),
      fontSize: '32px',
      fontWeight: '700',
      letterSpacing: '-1.5px',
      lineHeight: '48px',
      margin: 0,
    },
  },
  appBarHeight,
  navMenuWidth,
});

const useStyles = makeStyles(_ => ({
  main: {
    boxSizing: 'border-box',
    padding: '32px',
    marginLeft: navMenuWidth,
    position: 'absolute',
    width: `calc(100vw - ${navMenuWidth})`,
    top: appBarHeight,
  },
}));

const App = () => {
  const classes = useStyles();
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <NavMenu />
      <main className={classes.main}>
        <Switch>
          <Route path="/purses">
            <Purses />
          </Route>
          <Route path="/dapps">
            <Dapps />
          </Route>
          <Route path="/contacts">
            <Contacts />
          </Route>
          <Route path="/issuers">
            <Issuers />
          </Route>
          <Route path="/">
            <Dashboard />
          </Route>
        </Switch>
      </main>
      <AppBar />
    </ThemeProvider>
  );
};

export default App;
