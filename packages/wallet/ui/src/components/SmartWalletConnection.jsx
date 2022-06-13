const SmartWalletConnection = () => 'FIXME: SmartWalletConnection';

export default SmartWalletConnection;

export const buildWalletConnection = withApplicationContext =>
  withApplicationContext(SmartWalletConnection, context => ({
    setConnectionState: context.setConnectionState,
    connectionState: context.connectionState,
    wantConnection: context.wantConnection,
    setWantConnection: context.setWantConnection,
    setBackend: context.setBackend,
  }));
