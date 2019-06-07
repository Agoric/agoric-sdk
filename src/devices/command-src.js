import harden from '@agoric/harden';
import Nat from '@agoric/nat';

export default function setup(syscall, state, helpers, endowments) {
  const {
    registerInboundCallback,
    deliverResponse,
    sendBroadcast,
  } = endowments;

  let { inboundHandler } = state.get() || {};

  function build(_SO) {
    return {
      registerInboundHandler(handler) {
        inboundHandler = handler;
        state.set({ inboundHandler });
      },

      sendResponse(count, isReject, obj) {
        try {
          deliverResponse(count, isReject, JSON.stringify(obj));
        } catch (e) {
          console.log(`error during sendResponse: ${e} ${e.message}`);
        }
      },

      sendBroadcast(obj) {
        try {
          sendBroadcast(JSON.stringify(obj));
        } catch (e) {
          console.log(`error during sendBroadcast: ${e} ${e.message}`);
        }
      },
    };
  }

  return helpers.makeDeviceSlots(
    syscall,
    SO => {
      registerInboundCallback((count, bodyString) => {
        if (!inboundHandler) {
          throw new Error(`inboundCallback before registerInboundHandler`);
        }
        try {
          const body = JSON.parse(`${bodyString}`);
          SO(inboundHandler).inbound(Nat(count), body);
        } catch (e) {
          console.log(`error during inboundCallback: ${e} ${e.message}`);
          throw new Error(`error during inboundCallback: ${e} ${e.message}`);
        }
      });
      return harden(build(SO));
    },
    helpers.name,
  );
}
