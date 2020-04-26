// @ts-check
import rawHarden from '@agoric/harden';
import makeStore from '@agoric/store';

/* TODO: remove when types are done */
const harden = /** @type {<T>(x: T) => T} */ (rawHarden);

/**
 * @template T
 * @typedef {Object} Device
 */

/**
 * @typedef {Object} BridgeDevice
 * @property {(dstID: string, obj: any) => any} callOutbound
 * @property {(handler: { inbound: (srcID: string, obj: any) => void}) => void} registerInboundHandler
 */

/**
 *
 * @typedef {Object} BridgeHandler An object that can receive messages from the bridge device
 * @property {(srcId: string, obj: any) => Promise<void>} fromBridge Handle an inbound message
 *
 * @typedef {Object} BridgeManager The object to manage this bridge
 * @property {(dstID: string, obj: any) => void} toBridge
 * @property {(srcID: string, handler: BridgeHandler) => void} register
 * @property {(srcID: string, handler: BridgeHandler) => void} unregister
 */

/**
 * Create a handler that demuxes/muxes the bridge device by its first argument.
 *
 * @param {<T>(target: T) => T} E The eventual sender
 * @param {<T>(target: Device<T>) => T} D The device sender
 * @param {Device<BridgeDevice>} bridgeDevice The bridge to manage
 * @returns {BridgeManager} admin facet for this handler
 */
export function makeBridgeManager(E, D, bridgeDevice) {
  /**
   * @type {import('@agoric/store').Store<string, BridgeHandler>}
   */
  const srcHandlers = makeStore('srcID');

  function bridgeInbound(srcID, obj) {
    // console.log(
    //  `bridge inbound received ${srcID} ${JSON.stringify(obj, undefined, 2)}`,
    // );

    // Notify the specific handler, if there was one.
    E(srcHandlers.get(srcID)).fromBridge(srcID, obj);

    // No return value.
  }

  const bridgeHandler = harden({ inbound: bridgeInbound });

  function callOutbound(dstID, obj) {
    if (!bridgeDevice) {
      throw Error(`bridge device not yet connected`);
    }
    const retobj = D(bridgeDevice).callOutbound(dstID, obj);
    // note: *we* get this return value synchronously, but any callers (in
    // separate vats) only get a Promise, and will receive the value in some
    // future turn
    if (retobj && retobj.error) {
      throw Error(retobj.error);
    }
    return retobj;
  }

  // We now manage the device.
  D(bridgeDevice).registerInboundHandler(bridgeHandler);

  return harden({
    toBridge(dstID, obj) {
      return callOutbound(dstID, obj);
    },
    register(srcID, handler) {
      srcHandlers.init(srcID, handler);
    },
    unregister(srcID, handler) {
      if (srcHandlers.get(srcID) !== handler) {
        throw Error(`Handler was not registered for ${srcID}`);
      }
      srcHandlers.delete(srcID);
    },
  });
}
