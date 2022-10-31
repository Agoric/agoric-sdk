// @ts-check

import { makeStore } from '@agoric/store';
import '@agoric/store/exported.js';
import { assert, details as X } from '@agoric/assert';
import { Far } from '@endo/far';

/**
 * @template T
 * @typedef {'Device' & { __deviceType__: T }} Device
 */

/**
 * @typedef {object} BridgeDevice
 * @property {(dstID: string, obj: any) => any} callOutbound
 * @property {(handler: { inbound: (srcID: string, obj: any) => void}) => void} registerInboundHandler
 */

/**
 * Create a handler that demuxes/muxes the bridge device by its first argument.
 *
 * @param {typeof import('@endo/far').E} E The eventual sender
 * @param {<T>(target: Device<T>) => T} D The device sender
 * @param {Device<BridgeDevice>} bridgeDevice The bridge to manage
 * @returns {import('./types.js').BridgeManager} admin facet for this handler
 */
export function makeBridgeManager(E, D, bridgeDevice) {
  /**
   * @type {Store<string, ERef<import('./types.js').BridgeHandler>>}
   */
  const srcHandlers = makeStore('srcID');

  function bridgeInbound(srcID, obj) {
    // console.log(
    //  `bridge inbound received ${srcID} ${JSON.stringify(obj, undefined, 2)}`,
    // );

    // Notify the specific handler, if there was one.
    void E(srcHandlers.get(srcID)).fromBridge(srcID, obj);

    // No return value.
  }

  const bridgeHandler = Far('bridgeHandler', { inbound: bridgeInbound });

  function callOutbound(dstID, obj) {
    assert(bridgeDevice, X`bridge device not yet connected`);
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

  return Far('bridgeManager', {
    toBridge(dstID, obj) {
      return callOutbound(dstID, obj);
    },
    register(srcID, handler) {
      srcHandlers.init(srcID, handler);
    },
    unregister(srcID, handler) {
      srcHandlers.get(srcID) === handler ||
        assert.fail(X`Handler was not registered for ${srcID}`);
      srcHandlers.delete(srcID);
    },
  });
}
