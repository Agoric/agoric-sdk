import { Nat } from '@agoric/nat';
import { Far } from '@endo/marshal';

import { assert, details as X } from '@agoric/assert';
import { makeVatMessageValidator } from '../../limits/validate';

export function buildRootDeviceNode(tools) {
  const {
    SO,
    getDeviceState,
    setDeviceState,
    endowments,
    parseVatMessage = str => JSON.parse(`${str}`, makeVatMessageValidator()),
  } = tools;
  const { registerInboundCallback, deliverResponse, sendBroadcast } =
    endowments;
  let { inboundHandler } = getDeviceState() || {};

  registerInboundCallback((count, bodyString) => {
    try {
      assert(
        inboundHandler,
        X`inboundHandler not set before registerInboundCallback`,
      );
      const body = parseVatMessage(bodyString);
      SO(inboundHandler).inbound(Nat(count), body);
    } catch (e) {
      console.error(`error during inboundCallback:`, e);
      assert.note(e, X`error during inboundCallback`);
      throw e;
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
