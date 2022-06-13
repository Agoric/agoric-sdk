const SmartWalletConnection = ({
  setConnectionState,
  setWantConnection,
  walletConnection,
}) => {
  setTimeout(() => {
    setConnectionState('error');
    setWantConnection(false);
    alert(`\
Cannot connect to ${walletConnection.label}!

TODO: Smart Wallet connection is not yet implemented.

Choose a wallet connection one from settings.`);
  }, 1);
};

export default SmartWalletConnection;

export const buildWalletConnection = withApplicationContext =>
  withApplicationContext(SmartWalletConnection, context => ({
    setConnectionState: context.setConnectionState,
    setWantConnection: context.setWantConnection,
    walletConnection: context.walletConnection,
  }));
