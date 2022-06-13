import { mount } from 'enzyme';
import LoadingButton from '@mui/lab/LoadingButton';
import ChainConnector from '../ChainConnector';

jest.mock('../../util/SuggestChain', () => {
  return {
    NETWORK_CONFIGS: [
      ['https://main.agoric.net/network-config', 'Agoric Mainnet'],
      ['https://testnet.agoric.net/network-config', 'Agoric Testnet'],
    ],
    suggestChain: jest.fn(),
  };
});

const withApplicationContext =
  (Component, _) =>
  ({ ...props }) => {
    return <Component {...props} />;
  };

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

beforeEach(() => {
  delete window.getOfflineSigner;
  delete window.keplr;
});

test('renders the "Connect Wallet" button', () => {
  const component = mount(<ChainConnector setDialogOpened={jest.fn()} />);

  const button = component.find(LoadingButton);
  expect(button.exists()).toBeTruthy();
  expect(button.props().loading).toBeFalsy();
  expect(button.text()).toContain('Connect Wallet');
  expect(button.props().loading).toBeFalsy();
});
