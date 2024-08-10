import { makeScalarMapStore } from '@agoric/store';
import { makeCapTP } from '@endo/captp';
import { makePromiseKit } from '@endo/promise-kit';
import { HandledPromise } from '@endo/eventual-send';
import { Remotable } from '@endo/marshal';
import { Far, E } from '@endo/far';

/**
 * @template T
 * @typedef {T | PromiseLike<T>} ERef
 */

/** @type {{ onReset: (firstTime: Promise<boolean>) => void}} */
const DEFAULT_RESETTER = Far('resetter', { onReset: _ => {} });

/** @type {{ walk: (pluginRootP: any) => any }} */
const DEFAULT_WALKER = Far('walker', { walk: pluginRootP => pluginRootP });

/**
 * @template T
 * @typedef {'Device' & { __deviceType__: T }} Device
 */

/** @typedef {<T>(target: Device<T>) => T} DProxy (approximately) */

/**
 * @callback LoadPlugin
 * @param {string} specifier
 * @param {any} [opts=undefined]
 * @param {{ onReset: (firstTime: Promise<boolean>) => void}} [resetter=DEFAULT_RESETTER]
 * @returns {ERef<{ pluginRoot: ERef<any>, actions: { makeStableForwarder:
 * MakeStableForwarder }}>}
 *
 * @callback MakeStableForwarder
 * @param {{ walk: (pluginRootP: Promise<any>) => any }} [walker=DEFAULT_WALKER]
 * @returns {ERef<any>}
 */

/**
 * @typedef {object} PluginManager
 * @property {LoadPlugin} load
 */

/**
 * @typedef {object} Receiver
 * @property {(index: number, obj: Record<string, any>) => void} dispatch
 * @property {(index: number, epoch: number) => void} reset
 */

/**
 * @typedef { Device<ReturnType<typeof
 *   import('@agoric/swingset-vat/src/devices/plugin/device-plugin.js').buildRootDeviceNode>> } PluginDevice
 */

/**
 * Create a handler that manages a promise interface to external modules.
 *
 * @param {PluginDevice} pluginDevice The bridge to manage
 * @param {{ [prop: string]: any, D: DProxy }} param1
 * @returns {PluginManager} admin facet for this handler
 */
export function makePluginManager(pluginDevice, { D, ...vatPowers }) {
  /**
   * @typedef {object} AbortDispatch
   * @property {(epoch: number) => void} reset
   * @property {(obj: Record<string,any>) => void} dispatch
   */

  /**
   * @type {MapStore<number, AbortDispatch>}
   */
  const modConnection = makeScalarMapStore('moduleIndex');

  // Dispatch object to the right index.
  D(pluginDevice).registerReceiver(
    Far('receiver', {
      dispatch(index, obj) {
        const conn = modConnection.get(index);
        conn.dispatch(obj);
      },
      reset(index, epoch) {
        const conn = modConnection.get(index);
        conn.reset(epoch);
      },
    }),
  );

  return Far('plugin-manager', {
    getPluginDir() {
      return D(pluginDevice).getPluginDir();
    },
    /**
     * Load a module, and call resetter.onReset(pluginRootP) every time
     * it is instantiated.
     *
     * @type {LoadPlugin}
     */
    load(specifier, opts = undefined, resetter = DEFAULT_RESETTER) {
      // This is the internal state: a promise kit that doesn't
      // resolve until we are connected.  It is replaced by
      // a new promise kit when we abort the prior module connection.
      let pluginRootPK = makePromiseKit();
      let nextEpoch = 0;

      let currentEpoch;
      let currentDispatch = _ => {};
      let currentReset = _ => {};

      // Connect to the module.
      const index = D(pluginDevice).connect(specifier);
      if (typeof index !== 'number') {
        // An error string.
        throw Error(index);
      }

      // Register our stable callbacks for this connect index.
      modConnection.init(
        index,
        Far('connection', {
          dispatch(obj) {
            if (obj.epoch !== currentEpoch) {
              return false;
            }
            return currentDispatch(obj);
          },
          reset(epoch) {
            return currentReset(epoch);
          },
        }),
      );

      const connect = () => {
        // Create a CapTP channel.
        const myEpoch = nextEpoch;
        nextEpoch += 1;
        console.debug(
          `Connecting to ${specifier}.${index} with epoch ${myEpoch}`,
        );
        const { getBootstrap, dispatch } = makeCapTP(
          specifier,
          obj => {
            // console.warn('sending', index, obj);
            D(pluginDevice).send(index, obj);
          },
          undefined,
          { ...vatPowers, epoch: myEpoch },
        );

        currentReset = _epoch => {
          pluginRootPK = makePromiseKit();

          // Tell our clients we are resetting.
          void E(resetter).onReset(pluginRootPK.promise.then(_ => true));

          // Attempt to restart the protocol using the same device connection.
          connect();
        };

        currentDispatch = obj => {
          // console.warn('receiving', index, obj);
          dispatch(obj);
        };

        currentEpoch = myEpoch;

        // Publish our started plugin.
        pluginRootPK.resolve(E(getBootstrap()).start(opts));
      };

      const actions = Far('actions', {
        /**
         * Create a stable identity that just forwards to the current
         * implementation.
         *
         * @type {MakeStableForwarder}
         */
        makeStableForwarder(walker = DEFAULT_WALKER) {
          let pr;

          void new HandledPromise((_resolve, _reject, resolveWithPresence) => {
            // Use Remotable rather than Far to make a remote from a presence
            pr = Remotable(
              'Alleged: stableForwarder',
              undefined,
              resolveWithPresence({
                applyMethod(_p, name, args) {
                  // console.warn('applying method epoch', currentEpoch);
                  const targetP = E(walker).walk(pluginRootPK.promise);
                  return HandledPromise.applyMethod(targetP, name, args);
                },
                get(_p, name) {
                  // console.warn('applying get epoch', currentEpoch);
                  const targetP = E(walker).walk(pluginRootPK.promise);
                  return HandledPromise.get(targetP, name);
                },
              }),
            );
          });
          return pr;
        },
      });

      // Declare the first reset.
      void E(resetter).onReset(Promise.resolve(false));

      // Start the first connection.
      connect();

      // Give up our plugin root object for the caller to use.
      return harden({
        // This is the public state, a promise that never resolves,
        // but pipelines messages to the pluginRootPK.promise.
        pluginRoot: actions.makeStableForwarder(),
        actions,
      });
    },
  });
}
