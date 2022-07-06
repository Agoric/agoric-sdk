import { withApplicationContext } from '../contexts/Application';

const SmartWalletConnection = ({
  setConnectionState,
  setWantConnection,
  connectionConfig,
}) => {
  setTimeout(() => {
    setConnectionState('error');
    setWantConnection(false);

    // eslint-disable-next-line no-alert
    alert(`\
Cannot connect to ${connectionConfig.href}

TODO: Smart Wallet connection is not yet implemented.

Choose a wallet connection from the settings menu.`);
  }, 1);
};

export default withApplicationContext(SmartWalletConnection, context => ({
  setConnectionState: context.setConnectionState,
  setWantConnection: context.setWantConnection,
  connectionConfig: context.connectionConfig,
}));
