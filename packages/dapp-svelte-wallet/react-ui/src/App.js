import React from 'react';

import WalletConnection from './components/WalletConnection';

import './App.css';
import { useApplicationContext } from './contexts/Application';

const App = () => {
  const {
    state: { connectionState },
  } = useApplicationContext();

  return (
    <div className="App">
      <header className="App-header">
        Connection Status: {connectionState}
      </header>
      <WalletConnection></WalletConnection>
    </div>
  );
};

export default App;
