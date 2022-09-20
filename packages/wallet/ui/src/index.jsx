import '@endo/eventual-send/shim';

// Ambient types. Needed only for dev but this does a runtime import.
import '@agoric/zoe/exported.js';

import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import {
  CssBaseline,
  createTheme,
  ThemeProvider,
  StyledEngineProvider,
} from '@mui/material';
import App from './App';
import ApplicationContextProvider from './contexts/Provider';

Error.stackTraceLimit = Infinity;

const appTheme = createTheme({
  palette: {
    primary: {
      main: '#cb2328',
    },
    secondary: {
      main: 'hsla(0,0%,39.2%,.2)',
    },
    success: {
      main: 'rgb(76, 175, 80)',
    },
    cancel: {
      main: '#595959',
    },
    warning: {
      main: 'rgb(255, 152, 0)',
    },
    background: {
      default: '#ffffff',
    },
  },
  typography: {
    fontFamily: ['Roboto', 'Helvetica', 'Arial', 'sans-serif'].join(','),
    fontWeightRegular: 400,
    h1: {
      fontFamily: ['Montserrat', 'Arial', 'sans-serif'].join(','),
      fontSize: '32px',
      fontWeight: '700',
      letterSpacing: '-1.5px',
      lineHeight: '48px',
      margin: 0,
    },
  },
  appBarHeight: '64px',
  navMenuWidth: '240px',
});

ReactDOM.render(
  <ApplicationContextProvider>
    <Router basename="/wallet">
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={appTheme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </StyledEngineProvider>
    </Router>
  </ApplicationContextProvider>,
  document.getElementById('root'),
);
