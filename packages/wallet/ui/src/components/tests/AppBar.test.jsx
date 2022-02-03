import { mount } from 'enzyme';
import { createTheme, ThemeProvider } from '@mui/material';
import AppBar, { AppBarWithoutContext } from '../AppBar';
import ChainConnector from '../ChainConnector';
import WalletConnection from '../WalletConnection';

const withApplicationContext = (Component, _) => ({ ...props }) => {
  return <Component useChainBackend={false} {...props} />;
};

jest.mock('../../contexts/Application', () => {
  return { withApplicationContext };
});

jest.mock('../ChainConnector', () => () => 'Wallet Connection');

jest.mock('../WalletConnection', () => () => 'Chain Connector');

const appTheme = createTheme({
  pallete: {
    background: {
      default: '#fff',
    },
  },
  appBarHeight: '64px',
});

test('renders the wallet-connection when useChainBackend is false', () => {
  const component = mount(
    <ThemeProvider theme={appTheme}>
      <AppBar />
    </ThemeProvider>,
  );

  expect(component.find(WalletConnection).exists());
  expect(component.find(ChainConnector).exists()).toBeFalsy();
});

test('renders the wallet-connection when useChainBackend is true', () => {
  const component = mount(
    <ThemeProvider theme={appTheme}>
      <AppBarWithoutContext useChainBackend={true} />
    </ThemeProvider>,
  );

  expect(component.find(ChainConnector).exists());
  expect(component.find(WalletConnection).exists()).toBeFalsy();
});
