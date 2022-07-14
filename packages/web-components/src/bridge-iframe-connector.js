/* eslint-disable no-underscore-dangle */
import { html } from 'lit';
import { assert, details as X } from '@agoric/assert';

export const makeBridgeIframeConnector = component => {
  const connectedOnMessage = ev => {
    console.log(component.state, 'bridge received', ev);
    const { data } = ev.detail;
    if (data && typeof data.type === 'string') {
      if (data.type === 'walletBridgeClosed') {
        component.reset();
      }
      if (data.type.startsWith('CTP_')) {
        assert(component._captp);
        component._captp.dispatch(data);
      }
    }
  };

  let onMessage = event => {
    console.log(component.state, 'connect received', event);
    const { data, send } = event.detail;
    assert.equal(
      data.type,
      'walletBridgeLoaded',
      X`Unexpected connect message type ${data.type}`,
    );

    component._startCapTP(
      send,
      component.service.context.suggestedDappPetname,
      component._walletCallbacks,
    );

    onMessage = connectedOnMessage;

    // Received bridge announcement, so mark the connection as bridged.
    component.service.send({ type: 'connected' });
    component._bridgePK.resolve(component._captp.getBootstrap());
  };

  return {
    render: () => {
      const {
        location,
        connectionParams: { suggestedDappPetname },
      } = component.service.context;
      assert(location);
      const url = new URL(location);
      if (suggestedDappPetname) {
        url.searchParams.append('suggestedDappPetname', suggestedDappPetname);
      }
      return html`
        <agoric-iframe-messenger
          src=${url.href}
          @message=${onMessage}
          @error=${component.onError}
        ></agoric-iframe-messenger>
      `;
    },
    hostConnected() {},
    hostDisconnected() {},
  };
};
