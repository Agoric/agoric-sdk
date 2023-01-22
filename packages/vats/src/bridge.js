// @ts-check

import { makeScalarMapStore } from '@agoric/store';
import '@agoric/store/exported.js';
import { Fail } from '@agoric/assert';
import { Far } from '@endo/far';
import { makeWithQueue } from './queue.js';

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
   * @type {MapStore<string, import('./types.js').ScopedBridgeManager>}
   */
  const scopedManagers = makeScalarMapStore('bridgeId');

  function bridgeInbound(srcID, obj) {
    // console.log(
    //  `bridge inbound received ${srcID} ${JSON.stringify(obj, undefined, 2)}`,
    // );

    // Notify the specific handler, if there was one.
    void scopedManagers.get(srcID).fromBridge(obj);

    // No return value.
  }

  const bridgeHandler = Far('bridgeHandler', { inbound: bridgeInbound });

  const withOutboundQueue = makeWithQueue();
  const toBridge = withOutboundQueue((dstID, obj) => {
    bridgeDevice || Fail`bridge device not yet connected`;
    const retobj = D(bridgeDevice).callOutbound(dstID, obj);
    // note: *we* get this return value synchronously, but any callers (in
    // separate vats) only get a Promise, and will receive the value in some
    // future turn
    if (retobj && retobj.error) {
      throw Error(retobj.error);
    }
    return retobj;
  });

  // We now manage the device.
  D(bridgeDevice).registerInboundHandler(bridgeHandler);

  return Far('bridgeManager', {
    register(bridgeId, handler) {
      !scopedManagers.has(bridgeId) ||
        Fail`Scoped bridge manager already registered for ${bridgeId}`;
      const scopedManager = Far('bridgeSourceManager', {
        toBridge(obj) {
          return toBridge(bridgeId, obj);
        },
        fromBridge(obj) {
          // If no handler was set, this will fail
          // @ts-expect-error handler may be undefined
          return E(handler).fromBridge(obj);
        },
        setHandler(newHandler) {
          // setHandler could probably be on a separate facet to separate it
          // from the toBridge and fromBridge powers, but it's easier to
          // implement a set once check for the handler and pass a single
          // object around.
          !handler || Fail`Bridge handler already set for ${bridgeId}`;
          newHandler || Fail`Bridge handler required`;
          handler = newHandler;
        },
      });
      scopedManagers.init(bridgeId, scopedManager);
      return scopedManager;
    },
  });
}
