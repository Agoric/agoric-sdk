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
    const send = obj => ws.send(JSON.stringify(obj));
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

      // Find the websocket protocol for this path.
      const url = new URL('/private/captp', location);
      url.protocol = url.protocol.replace(/^http/, 'ws');

      if (accessToken) {
        url.searchParams.set('accessToken', accessToken);
      }

      ws = new WebSocket(url.href);
      ws.addEventListener('open', onAdminOpen);
      ws.addEventListener('error', () => component.onError);
    },
    hostDisconnected: () => {
      ws.close();
    },
  };
};
