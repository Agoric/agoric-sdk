import { act, waitFor } from '@testing-library/react';
import { mount } from 'enzyme';
import LoadingButton from '@mui/lab/LoadingButton';
import Dialog from '@mui/material/Dialog';
import ListItem from '@mui/material/ListItem';
import Snackbar from '@mui/material/Snackbar';
import { NETWORK_CONFIGS, suggestChain } from '../../util/SuggestChain';

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

const openDialog = component => {
  const button = component.find(LoadingButton);
  act(() => button.props().onClick());
  component.update();
};

const selectNetworkAtIndex = (component, index) => {
  openDialog(component);

  const dialog = component.find(Dialog);
  const options = dialog.find(ListItem);

  act(() =>
    options
      .at(index)
      .props()
      .onClick(),
  );
  component.update();
};

beforeEach(() => {
  delete window.getOfflineSigner;
  delete window.keplr;
});

test('renders the "Connect Wallet" button', () => {
  const component = mount(<ChainConnector />);

  const button = component.find(LoadingButton);
  expect(button.exists());
  expect(button.props().loading).toBeFalsy();
  expect(button.text()).toContain('Connect Wallet');
  expect(button.props().loading).toBeFalsy();
});

test('shows the "Select Network" dialog when the button is clicked', () => {
  const component = mount(<ChainConnector />);

  openDialog(component);

  // Assert that the dialog shows.
  const dialog = component.find(Dialog);
  expect(dialog.props().open).toBeTruthy();

  // Assert that it renders the correct content.
  expect(dialog.text()).toContain('Select Network');
  const options = dialog.find(ListItem);
  expect(options.length).toEqual(NETWORK_CONFIGS.length);
  expect(options.at(0).text()).toContain(NETWORK_CONFIGS[0][1]);
  expect(options.at(1).text()).toContain(NETWORK_CONFIGS[1][1]);
});

test('suggests the chain when a network is selected', async () => {
  window.getOfflineSigner = jest.fn();
  window.keplr = { experimentalSuggestChain: jest.fn() };

  const component = mount(<ChainConnector />);

  selectNetworkAtIndex(component, 0);
  let button = component.find(LoadingButton);
  expect(button.props().loading).toBeTruthy();

  await waitFor(() =>
    expect(suggestChain).toHaveBeenCalledWith(NETWORK_CONFIGS[0][0]),
  );
  component.update();

  button = component.find(LoadingButton);
  expect(button.text()).toContain('Connected');
  expect(button.props().loading).toBeFalsy();
});

test('shows an error when keplr is not installed', async () => {
  const component = mount(<ChainConnector />);

  let snackbar = component.find(Snackbar);
  expect(snackbar.props().open).toBeFalsy();

  selectNetworkAtIndex(component, 0);
  component.update();

  const button = component.find(LoadingButton);
  expect(button.text()).toContain('Connect Wallet');
  expect(button.props().loading).toBeFalsy();
  snackbar = component.find(Snackbar);
  expect(snackbar.props().open).toBeTruthy();
  expect(snackbar.text()).toContain('Please install the Keplr extension');
});

test('shows an error when keplr is not up-to-date', async () => {
  window.getOfflineSigner = jest.fn();
  window.keplr = {};
  const component = mount(<ChainConnector />);

  selectNetworkAtIndex(component, 0);
  component.update();

  const snackbar = component.find(Snackbar);
  expect(snackbar.props().open).toBeTruthy();
  expect(snackbar.text()).toContain(
    'Please use the most recent version of the Keplr extension',
  );
});

test('shows an error when keplr connection fails', async () => {
  window.getOfflineSigner = jest.fn();
  window.keplr = { experimentalSuggestChain: jest.fn() };
  suggestChain.mockImplementation(() => {
    throw new Error();
  });

  const component = mount(<ChainConnector />);

  selectNetworkAtIndex(component, 0);
  component.update();

  const snackbar = component.find(Snackbar);
  expect(snackbar.props().open).toBeTruthy();
  expect(snackbar.text()).toContain('Failed to connect to Keplr');
});
