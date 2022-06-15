/* global process */
import '@fontsource/roboto';
import '@fontsource/montserrat';

import './lockdown';
import '@endo/eventual-send/shim';

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
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
// import reportWebVitals from './reportWebVitals';

// Ensure our public directory is copied to the build directory.
// eslint-disable-next-line no-undef
require.context('./public/', true);

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

const basename = process.env.PUBLIC_URL;
ReactDOM.render(
  <ApplicationContextProvider>
    <Router basename={basename}>
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

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.register();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
