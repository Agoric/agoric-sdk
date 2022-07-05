import { act } from '@testing-library/react';
import { mount } from 'enzyme';
import { observeIterator } from '@agoric/notifier';
import WalletConnection from '../WalletConnection';
import { makeBackendFromWalletBridge } from '../../util/WalletBackendAdapter.js';
import { makeFixedWebSocketConnector } from '../../util/fixed-websocket-connector.js';

jest.mock('@endo/eventual-send', () => ({
  E: obj =>
    new Proxy(obj, {
      get(target, propKey) {
        const method = target[propKey];
        return (...args) => method.apply(this, args);
      },
    }),
}));

jest.mock('@agoric/web-components/react.js', () => {
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

jest.mock('../../util/fixed-websocket-connector.js', () => {
  return {
    makeFixedWebSocketConnector: jest.fn(),
  };
});

const setConnectionState = jest.fn();
const setBackend = jest.fn();
const connectionStatus = 'idle';
const connectionConfig = { accessToken: 'foo' };
const withApplicationContext =
  (Component, _) =>
  ({ ...props }) => {
    return (
      <Component
        setConnectionState={setConnectionState}
        connectionState={connectionStatus}
        connectionStatus={connectionStatus}
        setBackend={setBackend}
        connectionConfig={connectionConfig}
        {...props}
      />
    );
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

const fixedWebSocketConnector = { connector: 'foo' };

describe('WalletConnection', () => {
  let component;

  beforeEach(() => {
    observeIterator.mockReturnValue({
      catch: jest.fn(),
    });
    makeBackendFromWalletBridge.mockReturnValue({
      backendIt: 'mockBackendIterator',
      cancel: jest.fn(),
    });
    makeFixedWebSocketConnector.mockReturnValue(fixedWebSocketConnector);
    component = mount(<WalletConnection />);
  });

  test('dispatches the current connection state', () => {
    act(() =>
      component
        .find('wallet-connection')
        .props()
        .onState({
          detail: {
            walletConnection: { getAdminBootstrap: jest.fn() },
            state: 'connecting',
          },
        }),
    );

    expect(setConnectionState).toHaveBeenCalledWith('connecting');
  });

  describe('on idle state', () => {
    let getAdminBootstrap;

    beforeEach(() => {
      getAdminBootstrap = jest.fn(_ => ({}));
    });

    test('calls getAdminBootstrap with the access token', () => {
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

      expect(getAdminBootstrap).toHaveBeenCalledWith(
        'foo',
        fixedWebSocketConnector,
      );
    });
  });
});
