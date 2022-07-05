/* eslint-disable no-underscore-dangle */
import { E } from '@endo/eventual-send';

const CONNECTION_TIMEOUT_MS = 5000;

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

export const makeFixedWebSocketConnector = href => component => {
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
    const { dispatch, getBootstrap } = component._captp;

    ws.addEventListener('message', ev => {
      const obj = JSON.parse(ev.data);
      dispatch(obj);
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

      const connect = () => {
        // Cycle through the hrefs to find the websocket protocol for this path.
        const url = new URL('/private/captp', href);
        url.protocol = url.protocol.replace(/^http/, 'ws');

        if (accessToken) {
          url.searchParams.set('accessToken', accessToken);
        }

        const onClose = _ev => {
          return component.reset();
        };

        ws = new WebSocket(url.href);
        const timeout = window.setTimeout(() => {
          ws.close();
        }, CONNECTION_TIMEOUT_MS);

        ws.addEventListener('open', ev => {
          window.clearTimeout(timeout);
          return onAdminOpen(ev);
        });
        ws.addEventListener('close', onClose);
        ws.addEventListener('error', () => {});
      };
      connect(location);
    },
    hostDisconnected: () => {
      ws.close();
    },
  };
};
