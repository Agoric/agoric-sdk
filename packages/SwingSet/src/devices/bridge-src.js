import { assert, details as X } from '@agoric/assert';
import { Far } from '@agoric/marshal';

function sanitize(data) {
  // TODO: Use @agoric/marshal:pureCopy when it exists.
  // Note: It exists.
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
    assert(inboundHandler, X`inboundHandler not yet registered`);
    const safeArgs = JSON.parse(JSON.stringify(args));
    try {
      SO(inboundHandler).inbound(...harden(safeArgs));
    } catch (e) {
      console.error(`error during inboundCallback:`, e);
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
