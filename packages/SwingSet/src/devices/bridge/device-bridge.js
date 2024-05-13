import { Fail } from '@endo/errors';
import { Far } from '@endo/far';

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
 * @typedef {object} BridgeRoot
 * An object representing a bridge device from which messages can be received
 * via a handler and to which messages can be sent.
 * For multiplexing, each inbound or outbound message is associated with a string identifying its channel.
 * @property {(channelId: string, obj: any) => any} callOutbound
 * @property {(handler: { inbound: (channelId: string, obj: any) => void }) => void} registerInboundHandler
 * @property {() => void} unregisterInboundHandler
 */

/**
 * @param {*} tools
 * @returns {BridgeRoot}
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
    unregisterInboundHandler() {
      inboundHandler = undefined;
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
