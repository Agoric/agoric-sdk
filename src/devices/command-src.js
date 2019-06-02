import harden from '@agoric/harden';
import Nat from '@agoric/nat';

export default function setup(syscall, helpers, endowments) {
  const {
    registerInboundCallback,
    deliverResponse,
    sendBroadcast,
  } = endowments;
  function getState() {
    return {};
  }
  function setState(_newState) {
    throw new Error('inbound device not yet able to setState');
  }

  return helpers.makeDeviceSlots(
    syscall,
    SO =>
      harden({
        registerInboundHandler(handler) {
          registerInboundCallback((count, bodyString) => {
            try {
              const body = JSON.parse(bodyString);
              SO(handler).inbound(Nat(count), body);
            } catch (e) {
              console.log(`error during inboundCallback: ${e} ${e.message}`);
            }
          });
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
      }),
    getState,
    setState,
    helpers.name,
  );
}
