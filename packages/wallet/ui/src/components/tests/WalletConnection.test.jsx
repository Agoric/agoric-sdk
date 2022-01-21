import { act } from '@testing-library/react';
import { mount } from 'enzyme';
import { observeIterator } from '@agoric/notifier';
import Tooltip from '@mui/material/Tooltip';
import WalletConnection from '../WalletConnection';
import { makeBackendFromWalletBridge } from '../../util/WalletBackendAdapter.js';

jest.mock('@agoric/eventual-send', () => ({
  E: obj =>
    new Proxy(obj, {
      get(target, propKey) {
        const method = target[propKey];
        return (...args) => method.apply(this, args);
      },
    }),
}));

jest.mock('@agoric/wallet-connection/react.js', () => {
  return {
    makeReactAgoricWalletConnection: jest.fn(() => 'wallet-connection'),
  };
});

jest.mock('@agoric/notifier', () => {
  return {
    observeIterator: jest.fn(),
  };
});

jest.mock('../../util/WalletBackendAdapter.js', () => {
  return {
    makeBackendFromWalletBridge: jest.fn(),
  };
});

const setConnectionState = jest.fn();
const setBackend = jest.fn();
let connectionStatus = 'idle';
const withApplicationContext = (Component, _) => ({ ...props }) => {
  return (
    <Component
      setConnectionState={setConnectionState}
      connectionState={connectionStatus}
      setBackend={setBackend}
      {...props}
    />
  );
};
jest.mock('../../contexts/Application', () => {
  return { withApplicationContext };
});

describe('WalletConnection', () => {
  let component;

  beforeEach(() => {
    component = mount(<WalletConnection />);
  });

  test('dispatches the current connection state', () => {
    act(() =>
      component
        .find('wallet-connection')
        .props()
        .onState({ detail: { walletConnection: {}, state: 'connecting' } }),
    );

    expect(setConnectionState).toHaveBeenCalledWith('connecting');
  });

  test('displays the current connection status', () => {
    let connectionIndicator = component.find('.Connector').find(Tooltip);
    expect(connectionIndicator.props().title).toEqual('Disconnected');

    connectionStatus = 'bridged';
    component.setProps({ connectionStatus });
    connectionIndicator = component.find('.Connector').find(Tooltip);
    expect(connectionIndicator.props().title).toEqual('Connected');
  });

  test('resets the connection on error state', () => {
    const reset = jest.fn();

    act(() =>
      component
        .find('wallet-connection')
        .props()
        .onState({ detail: { walletConnection: { reset }, state: 'error' } }),
    );

    expect(reset).toHaveBeenCalled();
  });

  describe('on idle state', () => {
    const accessToken = 'asdf';
    const setItem = jest.fn();
    const getItem = _ => `?accessToken=${accessToken}`;
    let getAdminBootstrap;

    beforeEach(() => {
      getAdminBootstrap = jest.fn(_ => ({}));

      delete window.localStorage;
      window.localStorage = {
        setItem,
        getItem,
      };
    });

    describe('with an access token in the url', () => {
      beforeEach(() => {
        makeBackendFromWalletBridge.mockReturnValue('mockBackendIterator');
        delete window.location;
        window.location = {
          hash: `#accessToken=${accessToken}`,
        };

        act(() =>
          component
            .find('wallet-connection')
            .props()
            .onState({
              detail: {
                walletConnection: {
                  getAdminBootstrap,
                },
                state: 'idle',
              },
            }),
        );
      });

      test('calls getAdminBootstrap with the access token', () => {
        expect(getAdminBootstrap).toHaveBeenCalledWith(accessToken);
      });

      test('clears the accessToken from the url', () => {
        expect(window.location.hash).toEqual('');
      });

      test('stores the access token in local storage', () => {
        expect(setItem).toHaveBeenCalledWith(
          'accessTokenParams',
          `?accessToken=${accessToken}`,
        );
      });

      test('updates the store with the notifier data', () => {
        expect(makeBackendFromWalletBridge).toHaveBeenCalledWith(
          getAdminBootstrap(),
        );
        expect(observeIterator).toHaveBeenCalledWith('mockBackendIterator', {
          updateState: setBackend,
        });
      });
    });

    describe('with no access token in the url', () => {
      beforeEach(() => {
        delete window.location;
        window.location = {
          hash: '',
        };
      });

      test('calls getAdminBootstrap with the access token from local storage', () => {
        const getItemSpy = jest.spyOn(window.localStorage, 'getItem');

        act(() =>
          component
            .find('wallet-connection')
            .props()
            .onState({
              detail: {
                walletConnection: {
                  getAdminBootstrap,
                },
                state: 'idle',
              },
            }),
        );

        expect(getItemSpy).toHaveBeenCalledWith('accessTokenParams');
        expect(getAdminBootstrap).toHaveBeenCalledWith(accessToken);
      });
    });
  });
});
