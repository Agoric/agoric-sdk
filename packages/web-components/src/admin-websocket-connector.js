/* eslint-disable no-underscore-dangle */
import { E } from '@agoric/eventual-send';

// Wait for the wallet to finish loading.
export const waitForBootstrap = async getBootstrap => {
  const getLoadingUpdate = (...args) =>
    E(E.get(getBootstrap()).loadingNotifier).getUpdateSince(...args);
  let update = await getLoadingUpdate();
  while (update.value.includes('wallet')) {
    console.log('waiting for wallet');
    // eslint-disable-next-line no-await-in-loop
    update = await getLoadingUpdate(update.updateCount);
  }

  return getBootstrap();
};

export const makeAdminWebSocketConnector = component => {
  let ws;

  const onAdminOpen = () => {
    const send = obj => {
      if (ws.readyState !== WebSocket.OPEN) {
        return;
      }
      ws.send(JSON.stringify(obj));
    };
    component._startCapTP(send, 'walletAdmin');

    assert(component._captp);
    const { dispatch, abort, getBootstrap } = component._captp;

    ws.addEventListener('message', ev => {
      const obj = JSON.parse(ev.data);
      dispatch(obj);
    });

    ws.addEventListener('close', () => {
      abort();
    });

    const adminFacet = E(
      E.get(waitForBootstrap(getBootstrap)).wallet,
    ).getAdminFacet();
    adminFacet.then(component.service.send({ type: 'connected' }));
    component._bridgePK.resolve(adminFacet);
  };

  return {
    render: () => '',
    hostConnected: () => {
      const {
        location,
        connectionParams: { accessToken },
      } = component.service.context;
      assert(location);

      let retry = true;
      const connect = href => {
        // Find the websocket protocol for this path.
        const url = new URL('/private/captp', href);
        url.protocol = url.protocol.replace(/^http/, 'ws');

        if (accessToken) {
          url.searchParams.set('accessToken', accessToken);
        }

        ws = new WebSocket(url.href);
        ws.addEventListener('open', ev => {
          retry = false;
          return onAdminOpen(ev);
        });
        ws.addEventListener('error', ev => {
          if (retry) {
            // Try again with the window's own location, in case it's on a
            // nonstandard port.
            retry = false;
            return connect(window.location.href);
          }
          return component.onError(ev);
        });
      };
      connect(location);
    },
    hostDisconnected: () => {
      ws.close();
    },
  };
};
