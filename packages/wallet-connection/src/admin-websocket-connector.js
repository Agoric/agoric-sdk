/* eslint-disable no-underscore-dangle */

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

    component._bridgePK.resolve(getBootstrap());

    // Mark the connection as admin.
    component.service.send({ type: 'connected' });
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
