import { act } from '@testing-library/react';
import { mount } from 'enzyme';
import { ApplicationContext } from '../../contexts/Application';
import WalletConnection from '../WalletConnection';

jest.mock('@agoric/eventual-send', () => ({
  E: (obj) =>
    new Proxy(obj, {
      get(target, propKey) {
        const method = target[propKey];
        return (...args) =>
          new Promise((resolve) => resolve(method.apply(this, args)));
      },
    }),
}));

jest.mock('../../store.js', () => {
  return { reducer: jest.fn(), setConnectionState: (state) => state };
});

jest.mock('@agoric/wallet-connection/react.js', () => {
  return {
    makeReactAgoricWalletConnection: jest.fn(() => 'wallet-connection'),
  };
});

describe('WalletConnection', () => {
  let component;
  const dispatch = jest.fn();

  beforeEach(() => {
    component = mount(
      <ApplicationContext.Provider value={{ dispatch }}>
        <WalletConnection />
      </ApplicationContext.Provider>,
    );
  });

  test('dispatches the current connection state', () => {
    act(() =>
      component
        .find('wallet-connection')
        .props()
        .onState({ detail: { walletConnection: {}, state: 'connecting' } }),
    );

    expect(dispatch).toHaveBeenCalledWith('connecting');
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
    const getAdminBootstrap = jest.fn();
    const setItem = jest.fn();
    const getItem = (_) => `?accessToken=${accessToken}`;

    beforeEach(() => {
      delete window.localStorage;
      window.localStorage = {
        setItem,
        getItem,
      };
    });

    describe('with an access token in the url', () => {
      beforeEach(() => {
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
