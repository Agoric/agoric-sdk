import { assert, details as X } from '@agoric/assert';
import { Far } from '@endo/marshal';

function sanitize(data) {
  if (data === undefined) {
    return undefined;
  }
  if (data instanceof Error) {
    data = data.stack;
  }
  return JSON.parse(JSON.stringify(data));
}

export function buildRootDeviceNode(tools) {
  const { SO, getDeviceState, setDeviceState, endowments } = tools;
  const { registerInboundCallback, callOutbound } = endowments;
  let { inboundHandler } = getDeviceState() || {};

  function inboundCallback(...args) {
    try {
      assert(inboundHandler, X`inboundHandler not yet registered`);
      // We don't limit the size of the inbound bridge message; we trust that
      // the host has done that already.
      const safeArgs = JSON.parse(JSON.stringify(args));
      SO(inboundHandler).inbound(...harden(safeArgs));
    } catch (e) {
      console.error(`error during inboundCallback:`, e);
      assert.note(e, X`error during inboundCallback`);
      throw e;
    }
  }
  registerInboundCallback(inboundCallback);

  return Far('root', {
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
}
