import { mount } from 'enzyme';
import { createTheme, ThemeProvider } from '@mui/material';
import AppBar from '../AppBar';
import WalletConnection from '../WalletConnection';

const withApplicationContext =
  (Component, _) =>
  ({ ...props }) => {
    return (
      <Component
        useChainBackend={false}
        allWalletConnections={[
          'http://unit-test-net.agoric.com/network-config',
        ]}
        connectionStatus="Connecting"
        connectionState="connecting"
        {...props}
      />
    );
  };

jest.mock('../WalletConnection', () => () => 'Wallet Connection');

jest.mock('../../contexts/Application', () => {
  return {
    withApplicationContext,
    ConnectionStatus: {
      Connected: 'connected',
      Connecting: 'connecting',
      Disconnected: 'disconnected',
      Error: 'error',
    },
  };
});

jest.mock('../ChainConnector', () => () => 'Chain Connector');

jest.mock(
  '../ConnectionSettingsDialog',
  () => () => 'ConnectionSettingsDialog',
);

const appTheme = createTheme({
  pallete: {
    background: {
      default: '#fff',
    },
  },
  appBarHeight: '64px',
});

test('renders the connectionComponent', () => {
  const connectionComponent = <WalletConnection />;
  const component = mount(
    <ThemeProvider theme={appTheme}>
      <AppBar connectionComponent={connectionComponent} />
    </ThemeProvider>,
  );

  expect(component.find(WalletConnection).exists()).toBeTruthy();
});
