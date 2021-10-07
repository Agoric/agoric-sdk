/* eslint-disable react/display-name */
import React from 'react';

import WalletConnection from './components/WalletConnection';

import './App.css';
import { withApplicationContext } from './contexts/Application';

const App = ({ connectionState }) => {
  return (
    <div className="App">
      <header className="App-header">
        Connection Status: {connectionState}
      </header>
      <WalletConnection></WalletConnection>
    </div>
  );
};

export default withApplicationContext(App, context => ({
  connectionState: context.connectionState,
}));
