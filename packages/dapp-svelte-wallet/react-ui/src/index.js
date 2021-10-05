/* eslint-disable import/no-extraneous-dependencies */
import '@agoric/eventual-send/shim';

import React from 'react';
import ReactDOM from 'react-dom';

import './index.css';
import App from './App.js';
import ApplicationContextProvider from './contexts/Application';

Error.stackTraceLimit = Infinity;

ReactDOM.render(
  <ApplicationContextProvider>
    <App />
  </ApplicationContextProvider>,
  document.getElementById('root'),
);
