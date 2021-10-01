import { act } from '@testing-library/react';
import { mount } from 'enzyme';
import { ApplicationContext } from '../../contexts/Application';
import WalletConnection from '../WalletConnection';

jest.mock('@agoric/eventual-send', () => {
  return {
    E: (obj) => {
      return { ...obj };
    },
  };
});

jest.mock('../../store.js', () => {
  return { reducer: jest.fn(), setConnectionState: (state) => state };
});

jest.mock('@agoric/wallet-connection/react.js', () => {
  return {
    makeReactAgoricWalletConnection: jest.fn(() => 'wallet-connection'),
  };
});

test('WalletConnection dispatches current connection state', () => {
  const dispatch = jest.fn();
  const component = mount(
    <ApplicationContext.Provider value={{ dispatch }}>
      <WalletConnection />
    </ApplicationContext.Provider>,
  );

  act(() =>
    component
      .find('wallet-connection')
      .props()
      .onState({ detail: { walletConnection: {}, state: 'connecting' } }),
  );

  expect(dispatch).toHaveBeenCalledWith('connecting');
});

test('WalletConnection dispatches current connection state', () => {
  const dispatch = jest.fn();
  const mockGetAdminBootstrap = jest.fn();
  const component = mount(
    <ApplicationContext.Provider value={{ dispatch }}>
      <WalletConnection />
    </ApplicationContext.Provider>,
  );

  act(() =>
    component
      .find('wallet-connection')
      .props()
      .onState({
        detail: {
          walletConnection: {
            getAdminBoostrap: (token) => mockGetAdminBootstrap(token),
          },
          state: 'idle',
        },
      }),
  );

  expect(mockGetAdminBootstrap).toHaveBeenCalledWith('');
});
