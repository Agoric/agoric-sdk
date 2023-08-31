// @ts-check

import { M } from '@agoric/store';
import '@agoric/store/exported.js';
import { E } from '@endo/far';
import './core/types.js';
import { BridgeId } from '@agoric/internal';
import { watchPromise } from '@agoric/vat-data';

/** @typedef {{ rref: unknown; result: PromiseSettledResult<any> }} BridgeResultOneNotify */

const { Fail, details: X } = assert;

export const BridgeHandlerI = M.interface('BridgeHandler', {
  fromBridge: M.call(M.any()).returns(M.promise()),
});

export const BridgeScopedManagerI = M.interface('ScopedBridgeManager', {
  fromBridge: M.call(M.any()).returns(M.promise()),
  toBridge: M.call(M.any()).returns(M.promise()),
  initHandler: M.call(M.remotable('BridgeHandler')).returns(),
  setHandler: M.call(M.remotable('BridgeHandler')).returns(),
});

export const BridgeManagerI = M.interface('BridgeManager', {
  register: M.call(M.string())
    .optional(M.remotable('BridgeHandler'))
    .returns(M.remotable('BridgeScopedManager')),
});

const BridgeManagerIKit = harden({
  manager: BridgeManagerI,
  privateInbounder: M.interface('PrivateBridgeInbounder', {
    inbound: M.call(M.string(), M.any()).optional(M.any()).returns(),
  }),
  privateOutbounder: M.interface('PrivateBridgeOutbounder', {
    outbound: M.call(M.string(), M.any()).returns(M.promise()),
    outboundOnly: M.call(M.string(), M.any()).returns(),
  }),
  privateInboundResultHandler: M.interface('InboundResultHandler', {
    onFulfilled: M.call(M.any(), M.any()).returns(),
    onRejected: M.call(M.any(), M.any()).returns(),
  }),
});

/** @param {import('@agoric/zone').Zone} zone */
const prepareScopedManager = zone => {
  const makeScopedManager = zone.exoClass(
    'BridgeScopedManager',
    BridgeScopedManagerI,
    /**
     * @param {string} bridgeId
     * @param {{
     *   outbound: (bridgeId: string, obj: unknown) => Promise<any>;
     * }} toBridge
     * @param {import('./types').BridgeHandler} [inboundHandler]
     */
    (bridgeId, toBridge, inboundHandler) => ({
      bridgeId,
      toBridge,
      inboundHandler,
    }),
    {
      toBridge(obj) {
        const { toBridge, bridgeId } = this.state;
        return E(toBridge).outbound(bridgeId, obj);
      },
      // Cannot be async, the result promise from E().fromBridge must be returned
      // as-is to privateInbounder.inbound
      fromBridge(obj) {
        // If no handler was set, this will fail
        const { bridgeId, inboundHandler } = this.state;
        assert(inboundHandler, X`No inbound handler for ${bridgeId}`);
        return E(inboundHandler).fromBridge(obj);
      },
      // initHandler and setHandler could probably be on a separate facet to
      // separate it from the toBridge and fromBridge powers, but in most cases
      // the holder will also be the implementer of the handler. If needed,
      // the holder can always attenuate the object.
      // We implement separate init and set methods to require the holder to be
      // explicit about intent.
      initHandler(newHandler) {
        newHandler || Fail`Must provide a handler for ${this.state.bridgeId}`;
        !this.state.inboundHandler ||
          Fail`Bridge handler already initialized for ${this.state.bridgeId}`;
        this.state.inboundHandler = newHandler;
      },
      setHandler(newHandler) {
        newHandler || Fail`Must provide a handler for ${this.state.bridgeId}`;
        this.state.inboundHandler ||
          Fail`Bridge handler not yet initialized for ${this.state.bridgeId}`;
        this.state.inboundHandler = newHandler;
      },
    },
  );
  return makeScopedManager;
};

/**
 * @param {import('@agoric/zone').Zone} zone
 * @param {DProxy} D The device sender
 */
export const prepareBridgeManager = (zone, D) => {
  const makeScopedManager = prepareScopedManager(zone);

  /**
   * Create a bridge manager for multiplexing messages to and from a bridge
   * device using string-named channels.
   *
   * @param {BridgeDevice} bridgeDevice The bridge to manage
   * @returns {{
   *   manager: import('./types.js').BridgeManager;
   *   privateInbounder: { inbound(srcID: string, obj: unknown): void };
   *   privateOutbounder: {
   *     outbound(dstID: string, obj: unknown): Promise<any>;
   *   };
   * }}
   */
  const makeBridgeManagerKit = zone.exoClassKit(
    'BridgeManagerKit',
    BridgeManagerIKit,
    /** @param {BridgeDevice} bridgeDevice */
    bridgeDevice => ({
      /**
       * @type {MapStore<
       *   string,
       *   ReturnType<ReturnType<typeof prepareScopedManager>>
       * >}
       */
      scopedManagers: zone.detached().mapStore('scopedManagers'),
      bridgeDevice,
    }),
    {
      manager: {
        register(bridgeId, handler) {
          !this.state.scopedManagers.has(bridgeId) ||
            Fail`Scoped bridge manager already registered for ${bridgeId}`;
          const scopedManager = makeScopedManager(
            bridgeId,
            this.facets.privateOutbounder,
            handler,
          );
          this.state.scopedManagers.init(bridgeId, scopedManager);
          return scopedManager;
        },
      },
      /**
       * This facet is registered with each scoped manager to handle outbound
       * traffic, and is not exposed anywhere else.
       */
      privateOutbounder: {
        async outbound(dstID, obj) {
          const retobj = D(this.state.bridgeDevice).callOutbound(dstID, obj);
          // note: *we* get this return value synchronously, but any callers
          // only get a Promise, and will receive the value in some future turn
          if (retobj && retobj.error) {
            throw Error(retobj.error);
          }
          return retobj;
        },
        outboundOnly(dstID, obj) {
          const retobj = D(this.state.bridgeDevice).callOutbound(dstID, obj);
          if (retobj && retobj.error) {
            // Report any error as an asynchronous rejection
            void Promise.reject(Error(retobj.error));
          }
        },
      },
      /**
       * This facet is registered with the bridge device to handle inbound
       * messages, and is not exposed anywhere else.
       */
      privateInbounder: {
        inbound(srcID, obj, rref) {
          // Notify the specific handler, if there was one.
          const resultP = this.state.scopedManagers.get(srcID).fromBridge(obj);
          if (rref !== undefined) {
            watchPromise(
              resultP,
              this.facets.privateInboundResultHandler,
              rref,
            );
          }
          // No return value.
        },
      },
      /**
       * This facet is registered as a promise watcher for the `fromBridge`
       * handler result for every inbound message that expects to receive a
       * result sent back. It is not exposed anywhere else.
       */
      privateInboundResultHandler: {
        onFulfilled(value, rref) {
          /** @type {BridgeResultOneNotify} */
          const notify = harden({
            rref,
            result: {
              status: 'fulfilled',
              value,
            },
          });
          this.facets.privateOutbounder.outboundOnly(
            BridgeId.BRIDGE_RESULT,
            notify,
          );
        },
        onRejected(reason, rref) {
          /** @type {BridgeResultOneNotify} */
          const notify = harden({
            rref,
            result: {
              status: 'rejected',
              reason,
            },
          });
          this.facets.privateOutbounder.outboundOnly(
            BridgeId.BRIDGE_RESULT,
            notify,
          );
        },
      },
    },
  );

  /**
   * @type {MapStore<
   *   BridgeDevice,
   *   ReturnType<typeof makeBridgeManagerKit>
   * >}
   */
  const bridgeToManagerKit = zone.mapStore('bridgeToManagerKit');

  /**
   * Obtain the single manager associated with a bridge device.
   *
   * @param {BridgeDevice} bridgeDevice
   * @returns {import('./types.js').BridgeManager}
   */
  const provideManagerForBridge = bridgeDevice => {
    let kit;
    if (bridgeToManagerKit.has(bridgeDevice)) {
      kit = bridgeToManagerKit.get(bridgeDevice);
    } else {
      // Create a fresh manager kit.
      kit = makeBridgeManagerKit(bridgeDevice);

      // Register the new manager with the bridge device.
      D(bridgeDevice).registerInboundHandler(kit.privateInbounder);

      // Safe now to add the kit.
      bridgeToManagerKit.init(bridgeDevice, kit);
    }
    return kit.manager;
  };

  // Register all the handlers with their bridge devices.  This is necessary
  // because the device has no memory of its existing handler.
  for (const [device, { privateInbounder }] of bridgeToManagerKit.entries()) {
    D(device).unregisterInboundHandler();
    D(device).registerInboundHandler(privateInbounder);
  }

  return provideManagerForBridge;
};
