/* globals document */
import React from 'react';
import { render } from 'react-dom';

import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';

import ApplicationContextProvider from './contexts/Application';
import App from './pages/App';

const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#AB2328',
    },
    secondary: {
      main: '#508AA8',
    },
  },
  typography: {
    useNextVariants: true,
  },
});

render(
  <ApplicationContextProvider>
    <MuiThemeProvider theme={theme}>
      <App />
    </MuiThemeProvider>
  </ApplicationContextProvider>,
  document.getElementById('root'),
);
