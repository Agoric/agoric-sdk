import { Nat } from '@agoric/nat';
import { Far } from '@endo/marshal';

import { assert, details as X } from '@agoric/assert';

export function buildRootDeviceNode(tools) {
  const { SO, getDeviceState, setDeviceState, endowments } = tools;
  const {
    registerInboundCallback,
    deliverResponse,
    sendBroadcast,
  } = endowments;
  let { inboundHandler } = getDeviceState() || {};

  registerInboundCallback((count, bodyString) => {
    if (!inboundHandler) {
      throw new Error(
        `CMD inboundHandler not set before registerInboundHandler`,
      );
    }
    try {
      const body = JSON.parse(`${bodyString}`);
      SO(inboundHandler).inbound(Nat(count), body);
    } catch (e) {
      console.error(`error during inboundCallback:`, e);
      assert.fail(X`error during inboundCallback: ${e}`);
    }
  });

  return Far('root', {
    registerInboundHandler(handler) {
      inboundHandler = handler;
      setDeviceState(harden({ inboundHandler }));
    },

    sendResponse(count, isReject, obj) {
      try {
        deliverResponse(count, isReject, JSON.stringify(obj));
      } catch (e) {
        console.error(`error during sendResponse:`, e);
      }
    },

    sendBroadcast(obj) {
      try {
        sendBroadcast(JSON.stringify(obj));
      } catch (e) {
        console.error(`error during sendBroadcast:`, e);
      }
    },
  });
}
