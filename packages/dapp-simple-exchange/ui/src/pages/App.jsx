import React from 'react';

import {
  ThemeProvider,
  createMuiTheme,
  makeStyles,
} from '@material-ui/core/styles';
import { CssBaseline } from '@material-ui/core';

import Grid from '@material-ui/core/Grid';

import Header from '../components/Header';
import Web3Status from '../components/Web3Status';

import Wallet from '../components/Wallet';
import BuyAndSell from '../components/BuyAndSell';
import OrderBook from '../components/OrderBook';
import OrderHistory from '../components/OrderHistory';

const defaultTheme = createMuiTheme();

const customTheme = createMuiTheme({
  palette: {
    type: 'dark',
    background: {
      paper: '#202123',
      default: '#1B1B1B',
    },
    success: {
      main: '#3CB34F',
    },
    warning: {
      main: '#FF6534',
    },
  },
  overrides: {
    MuiOutlinedInput: {
      root: {
        '&$disabled': {
          border: '1px solid #1B1B1B',
        },
      },
    },
    MuiListItem: {
      divider: {
        borderBottom: 'none',
      },
    },
    MuiDivider: {
      root: {
        backgroundColor: '#1B1B1B',
      },
    },
    MuiTableCell: {
      head: {
        textTransform: 'uppercase',
        borderBottom: '1px solid #1B1B1B',
      },
      root: {
        paddingTop: defaultTheme.spacing(0.5),
        paddingBottom: defaultTheme.spacing(0.5),
        borderBottom: 'none',
        fontSize: '1.2em',
      },
    },
    MuiTabs: {
      indicator: {
        display: 'none',
      },
    },
    MuiTab: {
      root: {
        textTransform: 'none',
        fontSize: '1.5rem',
        borderRight: '1px solid #1B1B1B',
        '&:not($selected)': {
          backgroundColor: '#1E1E1F',
          borderBottom: '1px solid #1B1B1B',
        },
      },
    },
  },
});

const useStyles = makeStyles(theme => ({
  layout: {
    width: 'auto',
    margin: theme.spacing(3),
  },
}));

export default function App() {
  const classes = useStyles();

  function Layout() {
    return (
      <Grid container direction="row" spacing={3}>
        <Grid item xs={4}>
          <Grid container direction="column" spacing={3}>
            <Grid item>
              <Wallet />
            </Grid>
            <Grid item>
              <BuyAndSell />
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={3}>
          <OrderBook />
        </Grid>
        <Grid item xs={5}>
          <OrderHistory />
        </Grid>
      </Grid>
    );
  }

  return (
    <ThemeProvider theme={customTheme}>
      <CssBaseline />
      <Header>
        <Web3Status />
      </Header>
      <main className={classes.layout}>
        <Layout />
      </main>
    </ThemeProvider>
  );
}
