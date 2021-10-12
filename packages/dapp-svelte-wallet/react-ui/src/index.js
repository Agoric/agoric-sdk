/* eslint-disable import/no-extraneous-dependencies */
import '@agoric/eventual-send/shim';

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App.js';
import ApplicationContextProvider from './contexts/Application';

Error.stackTraceLimit = Infinity;

ReactDOM.render(
  <ApplicationContextProvider>
    <Router>
      <App />
    </Router>
  </ApplicationContextProvider>,
  document.getElementById('root'),
);
