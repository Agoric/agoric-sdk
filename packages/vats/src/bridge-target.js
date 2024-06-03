import { E } from '@endo/far';
import { M } from '@endo/patterns';

import { BridgeHandlerI } from './bridge.js';

/**
 * @typedef {any} MostlyPureData ideally should be PureData, but that type is
 *   too restrictive to work out-of-the-box.
 */

const { Fail } = assert;

/**
 * @typedef {object} TargetApp an object representing the app that receives
 *   upcalls from the low-level TargetHost on the other side of a bridge
 * @property {(obj: MostlyPureData) => Promise<MostlyPureData>} receiveUpcall
 *   receive data from the TargetHost, and return a data result
 */
// TODO unwrap type https://github.com/Agoric/agoric-sdk/issues/9163
export const TargetAppI = M.interface('TargetApp', {
  receiveUpcall: M.callWhen(M.any()).returns(M.any()),
});

/**
 * @typedef {object} TargetHost an object representing the host that receives
 *   downcalls from the high-level TargetApp over a bridge
 * @property {(obj: MostlyPureData) => Promise<MostlyPureData>} sendDowncall
 *   send data to the TargetHost, which returns a data result
 */
// TODO unwrap type https://github.com/Agoric/agoric-sdk/issues/9163
export const TargetHostI = M.interface('TargetHost', {
  sendDowncall: M.callWhen(M.any()).returns(M.any()),
});

/**
 * @typedef {object} TargetRegistration is an ExoClass of its own, and each
 *   instance is an attenuation of a BridgeTargetKit `targetRegistry` facet that
 *   has access to internal state thereof but has been scoped down to a single
 *   target.
 * @property {() => Promise<void>} revoke performs unregistration (and sends the
 *   corresponding "BRIDGE_TARGET_UNREGISTER" message to the targetHost).
 * @property {(targetApp: ERef<TargetApp>) => Promise<void>} updateTargetApp
 *   replaces the app associated with the target (but with no corresponding
 *   message).
 */
// TODO unwrap type https://github.com/Agoric/agoric-sdk/issues/9163
export const TargetRegistrationI = M.interface('TargetRegistration', {
  updateTargetApp: M.callWhen(M.await(M.remotable('TargetAppI'))).returns(),
  revoke: M.callWhen().returns(),
});

/**
 * @typedef {object} TargetRegistry
 * @property {(
 *   target: string,
 *   targetApp: ERef<TargetApp>,
 * ) => Promise<TargetRegistration>} register
 * @property {(target: string, targetApp: ERef<TargetApp>) => Promise<void>} reregister
 * @property {(target: string) => Promise<void>} unregister
 */
// TODO unwrap type https://github.com/Agoric/agoric-sdk/issues/9163
const TargetRegistryI = M.interface('TargetRegistry', {
  register: M.callWhen(M.string(), M.await(M.remotable('TargetAppI'))).returns(
    M.remotable('TargetRegistration'),
  ),
  reregister: M.callWhen(
    M.string(),
    M.await(M.remotable('TargetAppI')),
  ).returns(),
  unregister: M.callWhen(M.string()).returns(),
});

/** @param {import('@agoric/base-zone').Zone} zone */
export const prepareTargetRegistration = zone =>
  zone.exoClass(
    'TargetRegistration',
    TargetRegistrationI,
    /**
     * @param {string} target
     * @param {TargetRegistry} registry
     */
    (target, registry) => ({
      target,
      /** @type {TargetRegistry | null} */
      registry,
    }),
    {
      /**
       * Atomically point the registration at a different app.
       *
       * @param {TargetApp} app new app to handle messages for the target
       */
      async updateTargetApp(app) {
        const { target, registry } = this.state;
        if (!registry) {
          throw Fail`Registration for ${target} is already revoked`;
        }
        return E(registry).reregister(target, app);
      },
      /** Atomically delete the registration. */
      async revoke() {
        const { target, registry } = this.state;
        if (!registry) {
          throw Fail`Registration for ${target} is already revoked`;
        }
        this.state.registry = null;
        return E(registry).unregister(target);
      },
    },
  );

/**
 * A BridgeTargetKit is associated with a ScopedBridgeManager (essentially a
 * specific named channel on a bridge, cf. {@link ./bridge.js}) and a particular
 * inbound event type. It consists of three facets:
 *
 * - `targetHost` has a `downcall` method for sending outbound messages via the
 *   bridge to the VM host.
 * - `targetRegistry` has `register`, `reregister` and `unregister` methods to
 *   register/reregister/unregister an "app" with a "target" corresponding to an
 *   address on the targetHost. Each target may be associated with at most one
 *   app at any given time, and registration and unregistration each send a
 *   message to the targetHost of the state change (of type
 *   "BRIDGE_TARGET_REGISTER" and "BRIDGE_TARGET_UNREGISTER", respectively).
 *   `reregister` is a method that atomically redirects the target to a new
 *   app.
 * - `bridgeHandler` has a `fromBridge` method for receiving from the
 *   ScopedBridgeManager inbound messages of the associated event type and
 *   dispatching them to the app registered for their target.
 *
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {ReturnType<typeof prepareTargetRegistration>} makeTargetRegistration
 */
export const prepareBridgeTargetKit = (zone, makeTargetRegistration) =>
  zone.exoClassKit(
    'BridgeTargetKit',
    {
      bridgeHandler: BridgeHandlerI,
      targetHost: TargetHostI,
      targetRegistry: TargetRegistryI,
    },
    /**
     * @template {import('@agoric/internal').BridgeIdValue} T
     * @param {import('./types').ScopedBridgeManager<T>} manager
     * @param {string} inboundEventType
     */
    (manager, inboundEventType) => ({
      manager,
      inboundEventType,
      /** @type {MapStore<string, ERef<TargetApp>>} */
      targetToApp: zone.detached().mapStore('targetToApp'),
    }),
    {
      bridgeHandler: {
        fromBridge(obj) {
          const { inboundEventType, targetToApp } = this.state;
          const { type, target } = obj;

          type === inboundEventType ||
            Fail`Invalid inbound event type ${type}; expected ${inboundEventType}`;

          target || Fail`Missing target property in ${obj}`;

          const app = targetToApp.get(target);
          return E(app).receiveUpcall(obj);
        },
      },
      targetHost: {
        async sendDowncall(obj) {
          const { manager } = this.state;
          return E(manager).toBridge(obj);
        },
      },
      targetRegistry: {
        /**
         * Register an app to handle messages for a target.
         *
         * @param {string} target
         * @param {TargetApp} app
         * @returns {Promise<TargetRegistration>} power to set or delete the
         *   registration
         */
        async register(target, app) {
          const { targetHost } = this.facets;
          const { targetToApp } = this.state;

          !targetToApp.has(target) || Fail`Target ${target} already registered`;

          targetToApp.init(target, app);
          await E(targetHost).sendDowncall({
            type: 'BRIDGE_TARGET_REGISTER',
            target,
          });

          return makeTargetRegistration(target, this.facets.targetRegistry);
        },
        /**
         * Update the app that handles messages for a target.
         *
         * @param {string} target
         * @param {TargetApp} app
         * @returns {Promise<void>}
         */
        async reregister(target, app) {
          const { targetToApp } = this.state;
          targetToApp.has(target) ||
            Fail`Target ${target} is already unregistered`;

          targetToApp.set(target, app);
        },
        /**
         * Unregister the target, bypassing the attenuated `TargetRegistration`
         * API.
         *
         * @param {string} target
         * @returns {Promise<void>}
         */
        async unregister(target) {
          const { targetHost } = this.facets;
          const { targetToApp } = this.state;
          targetToApp.has(target) || Fail`Target ${target} is already deleted`;
          targetToApp.delete(target);
          await E(targetHost).sendDowncall({
            type: 'BRIDGE_TARGET_UNREGISTER',
            target,
          });
        },
      },
    },
  );
harden(prepareBridgeTargetKit);

/** @param {import('@agoric/base-zone').Zone} zone */
export const prepareBridgeTargetModule = zone => {
  const makeTargetRegistration = prepareTargetRegistration(zone);
  const makeBridgeTargetKit = prepareBridgeTargetKit(
    zone,
    makeTargetRegistration,
  );

  return harden({ makeBridgeTargetKit });
};
harden(prepareBridgeTargetModule);
