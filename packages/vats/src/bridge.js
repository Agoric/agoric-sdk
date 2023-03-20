// @ts-check

import { M } from '@agoric/store';
import '@agoric/store/exported.js';
import { E } from '@endo/far';
import './core/types.js';

const { Fail, details: X } = assert;

export const BridgeHandlerI = M.interface('BridgeHandler', {
  fromBridge: M.call(M.any()).returns(M.promise()),
});

export const BridgeChannelI = M.interface('ScopedBridgeManager', {
  fromBridge: M.call(M.any()).returns(M.promise()),
  toBridge: M.call(M.any()).returns(M.promise()),
  setHandler: M.call(M.remotable('BridgeHandler')).returns(),
});

export const BridgeManagerI = M.interface('BridgeManager', {
  register: M.call(M.string())
    .optional(M.remotable('BridgeHandler'))
    .returns(M.remotable('BridgeChannel')),
});

const BridgeManagerIKit = harden({
  manager: BridgeManagerI,
  privateInbounder: M.interface('PrivateBridgeInbounder', {
    inbound: M.call(M.string(), M.any()).returns(),
  }),
  privateOutbounder: M.interface('PrivateBridgeOutbounder', {
    outbound: M.call(M.string(), M.any()).returns(M.promise()),
  }),
});

/**
 * @param {import('@agoric/zone').Zone} zone
 */
const prepareBridgeChannel = zone => {
  const makeBridgeChannel = zone.exoClass(
    'BridgeChannel',
    BridgeChannelI,
    /**
     * @param {string} bridgeId
     * @param {{ outbound: (bridgeId: string, obj: unknown) => Promise<any> }} toBridge
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
      fromBridge(obj) {
        // If no handler was set, this will fail
        const { bridgeId, inboundHandler } = this.state;
        assert(inboundHandler, X`No inbound handler for ${bridgeId}`);
        return E(inboundHandler).fromBridge(obj);
      },
      setHandler(newHandler) {
        // setHandler could probably be on a separate facet to separate it
        // from the toBridge and fromBridge powers, but it's easier to
        // implement a set once check for the handler and pass a single
        // object around.
        !this.state.inboundHandler ||
          Fail`Bridge channel inbound handler already set for ${this.state.bridgeId}`;
        this.state.inboundHandler = newHandler;
      },
    },
  );
  return makeBridgeChannel;
};

/**
 * @param {import('@agoric/zone').Zone} zone
 * @param {DProxy} D The device sender
 */
export const prepareBridgeManager = (zone, D) => {
  const makeBridgeChannel = prepareBridgeChannel(zone);

  /**
   * Create a bridge manager for multiplexing messages to and from a bridge device
   * using string-named channels.
   *
   * @param {BridgeDevice} bridgeDevice The bridge to manage
   * @returns {{
   *   manager: import('./types.js').BridgeManager,
   *   privateInbounder: { inbound(channelId: string, obj: unknown): void },
   *   privateOutbounder: { outbound(channelId: string, obj: unknown): Promise<any> },
   * }}
   */
  const makeBridgeManagerKit = zone.exoClassKit(
    'BridgeManagerKit',
    BridgeManagerIKit,
    /** @param {BridgeDevice} bridgeDevice */
    bridgeDevice => ({
      /** @type {MapStore<string, ReturnType<typeof makeBridgeChannel>>} */
      idToChannel: zone.detached().mapStore('idToChannel'),
      bridgeDevice,
    }),
    {
      manager: {
        register(tag, handler) {
          !this.state.idToChannel.has(tag) ||
            Fail`Bridge channel already registered for ${tag}`;
          const bridgeChannel = makeBridgeChannel(
            tag,
            this.facets.privateOutbounder,
            handler,
          );
          this.state.idToChannel.init(tag, bridgeChannel);
          return bridgeChannel;
        },
      },
      /**
       * This facet is registered with each bridge channel to handle outbound
       * traffic, and is not exposed anywhere else.
       */
      privateOutbounder: {
        async outbound(channelId, obj) {
          const retobj = D(this.state.bridgeDevice).callOutbound(
            channelId,
            obj,
          );
          // note: *we* get this return value synchronously, but any callers
          // only get a Promise, and will receive the value in some future turn
          if (retobj && retobj.error) {
            throw Error(retobj.error);
          }
          return retobj;
        },
      },
      /**
       * This facet is registered with the bridge device to handle inbound
       * messages, and is not exposed anywhere else.
       */
      privateInbounder: {
        inbound(channelId, obj) {
          // Notify the specific handler, if there was one.
          void this.state.idToChannel.get(channelId).fromBridge(obj);

          // No return value.
        },
      },
    },
  );

  // Retrieve or create the collection of manager kits.
  /** @type {MapStore<BridgeDevice, ReturnType<typeof makeBridgeManagerKit>>} */
  const bridgeToManagerKit = zone.mapStore('bridgeToManagerKit');

  // Restore inbound handlers from a previous incarnation.
  for (const [device, { privateInbounder }] of bridgeToManagerKit.entries()) {
    D(device).unregisterInboundHandler();
    D(device).registerInboundHandler(privateInbounder);
  }

  /**
   * A read-only create-on-demand interface to the map from a bridge device to a
   * bridge manager. Each of these bridge managers exposes a collection of
   * channels.
   *
   * Each channel is bound to an ID string, multiplexes outbound messages on the
   * bridge device by attaching its ID, and the manager demultiplexes inbound
   * messages by dispaching them to the channel handler (if any) associated with
   * the inbound ID.
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

      // Safe now to track the kit persistently.
      bridgeToManagerKit.init(bridgeDevice, kit);
    }
    return kit.manager;
  };

  return provideManagerForBridge;
};
