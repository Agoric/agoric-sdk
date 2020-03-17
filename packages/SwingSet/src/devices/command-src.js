import harden from '@agoric/harden';
import Nat from '@agoric/nat';

export default function setup(syscall, state, helpers, endowments) {
  const {
    registerInboundCallback,
    deliverResponse,
    sendBroadcast,
  } = endowments;

  function build({ SO, getDeviceState, setDeviceState }) {
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
        console.log(`error during inboundCallback`, e);
        throw new Error(`error during inboundCallback: ${e}`);
      }
    });

    return harden({
      registerInboundHandler(handler) {
        inboundHandler = handler;
        setDeviceState(harden({ inboundHandler }));
      },

      sendResponse(count, isReject, obj) {
        if (isReject && obj instanceof Error) {
          console.log('inboundHandler rejected with:', obj);
          obj = { error: `${obj}` };
        }
        try {
          deliverResponse(count, isReject, JSON.stringify(obj));
        } catch (e) {
          console.log(`error during sendResponse: ${e}`);
        }
      },

      sendBroadcast(obj) {
        try {
          sendBroadcast(JSON.stringify(obj));
        } catch (e) {
          console.log(`error during sendBroadcast: ${e}`);
        }
      },
    });
  }

  return helpers.makeDeviceSlots(syscall, state, build, helpers.name);
}
