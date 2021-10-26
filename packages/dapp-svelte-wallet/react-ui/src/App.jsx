/* eslint-disable react/display-name */
import React from 'react';
import { Switch, Route } from 'react-router-dom';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import AppBar from './components/AppBar';
import NavMenu from './components/NavMenu';
import Contacts from './views/Contacts';
import Dapps from './views/Dapps';
import Dashboard from './views/Dashboard';
import Purses from './views/Purses';
import Issuers from './views/Issuers';

const useStyles = makeStyles(theme => ({
  main: {
    boxSizing: 'border-box',
    padding: '32px',
    marginLeft: theme.navMenuWidth,
    position: 'absolute',
    width: `calc(100vw - ${theme.navMenuWidth})`,
    top: theme.appBarHeight,
    [theme.breakpoints.down('sm')]: {
      marginLeft: '0',
      width: '100vw',
    },
  },
  navMenu: {
    [theme.breakpoints.down('sm')]: {
      display: 'none',
    },
  },
}));

const App = () => {
  const classes = useStyles(useTheme());
  return (
    <>
      <span className={classes.navMenu}>
        <NavMenu />
      </span>
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
    </>
  );
};

export default App;
