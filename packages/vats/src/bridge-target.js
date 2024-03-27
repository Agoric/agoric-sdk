// @ts-check
import { E } from '@endo/far';
import { M } from '@endo/patterns';

import { BridgeHandlerI } from './bridge.js';

const { Fail } = assert;

/**
 * @typedef {object} App
 * @property {(obj: any) => Promise<unknown>} upcall return value depends on the
 *   bridge semantics
 */
export const AppI = M.interface('App', {
  upcall: M.call(M.any()).returns(M.promise()),
});

/**
 * @typedef {object} System
 * @property {(obj: any) => Promise<any>} downcall
 */
export const SystemI = M.interface('System', {
  downcall: M.callWhen(M.any()).returns(),
});

/**
 * @typedef {object} TargetUnregister
 * @property {() => Promise<void>} unregister
 */
const TargetUnregisterI = M.interface('TargetUnregister', {
  unregister: M.callWhen().returns(),
});

/**
 * @typedef {object} TargetRegistry
 * @property {(target: string, app: ERef<App>) => Promise<TargetUnregister>} register
 * @property {(target: string) => Promise<void>} unregister
 */
const TargetRegistryI = M.interface('TargetRegistry', {
  register: M.callWhen(M.string(), M.await(M.remotable('AppI'))).returns(
    M.remotable('TargetUnregister'),
  ),
  unregister: M.callWhen(M.string()).returns(),
});

/** @param {import('@agoric/base-zone').Zone} zone */
export const prepareTargetUnregister = zone =>
  zone.exoClass(
    'TargetUnregister',
    TargetUnregisterI,
    /**
     * @param {System} system
     * @param {string} target
     * @param {MapStore<string, ERef<App>>} targetToApp
     */
    (system, target, targetToApp) => ({
      system,
      target,
      targetToApp,
      registered: true,
    }),
    {
      async unregister() {
        const { system, target, targetToApp, registered } = this.state;
        if (!registered) {
          throw Error(`This target is already unregistered`);
        }
        this.state.registered = false;
        targetToApp.delete(target);
        await E(system).downcall({ type: 'BRIDGE_TARGET_UNREGISTER', target });
      },
    },
  );

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {ReturnType<typeof prepareTargetUnregister>} makeTargetUnregister
 */
export const prepareBridgeTargetKit = (zone, makeTargetUnregister) =>
  zone.exoClassKit(
    'BridgeTargetKit',
    {
      bridgeHandler: BridgeHandlerI,
      system: SystemI,
      targetRegistry: TargetRegistryI,
    },
    /**
     * @param {import('./types').ScopedBridgeManager} manager
     * @param {string} inboundEventType
     */
    (manager, inboundEventType) => ({
      manager,
      inboundEventType,
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
          return E(app).upcall(obj);
        },
      },
      system: {
        async downcall(obj) {
          const { manager } = this.state;
          return E(manager).toBridge(obj);
        },
      },
      targetRegistry: {
        async unregister(target) {
          const { system } = this.facets;
          const { targetToApp } = this.state;
          const unregistrar = makeTargetUnregister(system, target, targetToApp);
          return unregistrar.unregister();
        },
        async register(target, app) {
          const { system } = this.facets;
          const { targetToApp } = this.state;

          const unregistrar = makeTargetUnregister(system, target, targetToApp);
          if (targetToApp.has(target)) {
            targetToApp.set(target, app);
            return unregistrar;
          }

          targetToApp.init(target, app);
          await E(system).downcall({ type: 'BRIDGE_TARGET_REGISTER', target });
          return unregistrar;
        },
      },
    },
  );
harden(prepareBridgeTargetKit);

/** @param {import('@agoric/base-zone').Zone} zone */
export const prepareBridgeTargetModule = zone => {
  const makeTargetUnregister = prepareTargetUnregister(zone);
  const makeBridgeTargetKit = prepareBridgeTargetKit(
    zone,
    makeTargetUnregister,
  );

  return harden({ makeBridgeTargetKit });
};
harden(prepareBridgeTargetModule);
