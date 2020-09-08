/* global harden */
// @ts-check

import makeStore from '@agoric/store';
import { makeCapTP } from '@agoric/captp';
import { makePromiseKit } from '@agoric/promise-kit';
import { E, HandledPromise } from '@agoric/eventual-send';
import { assert } from '@agoric/assert';

/**
 * @template T
 * @typedef {T} Device
 */

/**
 * @typedef {Object} PluginManager
 * @property {(mod: string) => ERef<any>} load
 */

/**
 * @typedef {Object} Receiver
 * @property {(index: number, obj: Record<string, any>) => void} dispatch
 * @property {(index: number, epoch: number) => void} reset
 */

/**
 * @typedef {Object} PluginDevice
 * @property {(mod: string) => number} connect
 * @property {(receiver: Receiver) => void} registerReceiver
 * @property {(index: number, obj: Record<string, any>) => void} send
 */

/**
 * Create a handler that manages a promise interface to external modules.
 *
 * @param {Device<PluginDevice>} pluginDevice The bridge to manage
 * @param {{ D<T>(target: Device<T>): T }} param1
 * @returns {PluginManager} admin facet for this handler
 */
export function makePluginManager(pluginDevice, { D, ...vatPowers }) {
  /**
   * @typedef {Object} AbortDispatch
   * @property {(epoch: number) => void} reset
   * @property {(obj: Record<string,any>) => void} dispatch
   */

  /**
   * @type {import('@agoric/store').Store<number, AbortDispatch>}
   */
  const modConnection = makeStore('moduleIndex');

  // Dispatch object to the right index.
  D(pluginDevice).registerReceiver(
    harden({
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

  return harden({
    /**
     * Load a module, and call resetter.onReset(bootP) every time it is instantiated.
     */
    load(mod, resetter = { onReset: _ => {} }) {
      // This is the internal state: a promise kit that doesn't
      // resolve until we are connected.  It is replaced by
      // a new promise kit when we abort the prior module connection.
      let bootPK = makePromiseKit();
      let nextEpoch = 0;

      let currentEpoch;
      let currentDispatch = _ => {};
      let currentReset = _ => {};

      // Connect to the module.
      const index = D(pluginDevice).connect(mod);
      if (typeof index !== 'number') {
        // An error string.
        throw Error(index);
      }

      // Register our stable callbacks for this connect index.
      modConnection.init(
        index,
        harden({
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
        console.info(`Connecting to ${mod}.${index} with epoch ${myEpoch}`);
        const { getBootstrap, dispatch } = makeCapTP(
          mod,
          obj => {
            // console.warn('sending', index, obj);
            D(pluginDevice).send(index, obj);
          },
          undefined,
          { ...vatPowers, epoch: myEpoch },
        );

        currentReset = _epoch => {
          bootPK = makePromiseKit();

          // Tell our clients we are resetting.
          E(resetter).onReset(bootPK.promise.then(_ => true));

          // Attempt to restart the protocol using the same device connection.
          connect();
        };

        currentDispatch = obj => {
          // console.warn('receiving', index, obj);
          dispatch(obj);
        };

        currentEpoch = myEpoch;

        // Publish our bootstrap promise.
        bootPK.resolve(getBootstrap());
      };

      const actions = harden({
        /**
         * Create a stable identity that just forwards to the current implementation.
         */
        makeStableForwarder(walker = { walk: bootP => bootP }) {
          let pr;
          // eslint-disable-next-line no-new
          new HandledPromise((_resolve, _reject, resolveWithPresence) => {
            pr = resolveWithPresence({
              applyMethod(_p, name, args) {
                // console.warn('applying method epoch', currentEpoch);
                const targetP = E(walker).walk(bootPK.promise);
                return HandledPromise.applyMethod(targetP, name, args);
              },
              get(_p, name) {
                // console.warn('applying get epoch', currentEpoch);
                const targetP = E(walker).walk(bootPK.promise);
                return HandledPromise.get(targetP, name);
              },
            });
          });
          return pr;
        },
      });

      // Declare the first reset.
      E(resetter).onReset(false);

      // Start the first connection.
      connect();

      // Give up our bootstrap object for the caller to use.
      return harden({
        // This is the public state, a promise that never resolves,
        // but pipelines messages to the bootPK.promise.
        bootstrap: actions.makeStableForwarder(),
        actions,
      });
    },
  });
}
