import harden from '@agoric/harden';

function sanitize(data) {
  // TODO: Use @agoric/marshal:pureCopy when it exists.
  if (data === undefined) {
    return undefined;
  }
  if (data instanceof Error) {
    data = data.stack;
  }
  return JSON.parse(JSON.stringify(data));
}

// security note: this device gets access to primal-realm object types (the
// return value or Error thrown by callOutbound(), and the arguments provided
// to inboundCallback()), but we immediately serialize them, so they will not
// leak to other devices or vats

export default function setup(syscall, state, helpers, endowments) {
  const { registerInboundCallback, callOutbound } = endowments;

  return helpers.makeDeviceSlots(
    syscall,
    state,
    s => {
      const { SO, getDeviceState, setDeviceState } = s;
      let { inboundHandler } = getDeviceState() || {};

      function inboundCallback(...args) {
        if (!inboundHandler) {
          throw new Error(`inboundHandler not yet registered`);
        }
        const safeArgs = JSON.parse(JSON.stringify(args));
        try {
          SO(inboundHandler).inbound(...harden(safeArgs));
        } catch (e) {
          console.error(`error during inboundCallback:`, e);
        }
      }
      registerInboundCallback(inboundCallback);

      return harden({
        registerInboundHandler(handler) {
          if (inboundHandler) {
            throw Error('inboundHandler already registered');
          }
          inboundHandler = handler;
          setDeviceState(harden({ inboundHandler }));
        },
        callOutbound(...args) {
          // invoke our endowment of the same name, with a sync return value
          const retval = callOutbound(...args);
          // we can return anything JSON-serializable, plus 'undefined'
          return harden(sanitize(retval));
        },
      });
    },
    helpers.name,
  );
}
