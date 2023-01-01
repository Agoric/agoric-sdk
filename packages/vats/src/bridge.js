// @ts-check

import { makeScalarMapStore } from '@agoric/store';
import '@agoric/store/exported.js';
import { Fail } from '@agoric/assert';
import { Far } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';
import { BridgeId } from '@agoric/internal';

/**
 * @template T
 * @typedef {'Device' & { __deviceType__: T }} Device
 */

/** @typedef { {bpid: string; result: PromiseSettledResult<any>} } BridgeOutboundResultOneNotify */

/**
 * @typedef {object} BridgeDevice
 * @property {(dstID: string, obj: any, bpid: string) => void} callOutbound
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

  let nextPromiseId = 1n;

  /** @type {Map<string, Pick<PromiseKit<any>, 'resolve' | 'reject'>>} */
  const pendingResults = new Map();
  const resultHandler = Far('bridgeCallOutboundResultHandler', {
    /** @param {BridgeOutboundResultOneNotify[]} notifies */
    async fromBridge(notifies) {
      for (const { bpid, result } of notifies) {
        const resolveKit = pendingResults.get(bpid);
        if (!resolveKit) {
          throw Fail`Unknown bridge result promise ${bpid}`;
        }
        pendingResults.delete(bpid);
        if (result.status === 'fulfilled') {
          resolveKit.resolve(result.value);
        } else {
          // The content must be JSON serializable so reconstruct the error here
          resolveKit.reject(new Error(result.reason));
        }
      }
    },
    allocateResult() {
      const { resolve, reject, promise } = makePromiseKit();
      const bpid = `bp${nextPromiseId}`;
      nextPromiseId += 1n;
      pendingResults.set(bpid, harden({ resolve, reject }));
      return { bpid, promise };
    },
  });

  const toBridge = async (dstID, obj) => {
    bridgeDevice || Fail`bridge device not yet connected`;
    const { bpid, promise } = resultHandler.allocateResult();
    try {
      D(bridgeDevice).callOutbound(dstID, obj, bpid);
    } catch (error) {
      console.error('Synchronous error while invoking callOutbound', error);
      resultHandler.fromBridge([
        {
          bpid,
          result: {
            status: 'rejected',
            reason: `callOutbound failure: ${error}`,
          },
        },
      ]);
    }
    return promise;
  };

  // We now manage the device.
  D(bridgeDevice).registerInboundHandler(bridgeHandler);

  /** @type {import('./types.js').BridgeManager} */
  const bridgeManager = Far('bridgeManager', {
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
  bridgeManager.register(BridgeId.OUTBOUND_RESULT, resultHandler);

  return bridgeManager;
}
