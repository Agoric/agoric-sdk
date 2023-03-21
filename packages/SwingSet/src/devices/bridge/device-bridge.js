import { Fail } from '@agoric/assert';
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

/**
 * @typedef {object} BridgeDevice
 * @property {(...args: any[]) => any} callOutbound
 * @property {(handler: { inbound: (...args: any[]) => void}) => void} registerInboundHandler
 */

/**
 *
 * @param {*} tools
 * @returns {BridgeDevice}
 */
export function buildRootDeviceNode(tools) {
  const { SO, getDeviceState, setDeviceState, endowments } = tools;
  const { registerInboundCallback, callOutbound } = endowments;
  let { inboundHandler } = getDeviceState() || {};

  function inboundCallback(...args) {
    inboundHandler || Fail`inboundHandler not yet registered`;
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
