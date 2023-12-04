// @ts-check
/* global globalThis */
import { E } from '@endo/far';
import { M } from '@endo/patterns';

import { prepareWhenableKit } from './whenable.js';
import { getFirstWhenable } from './whenable-utils.js';

const { Fail } = assert;

export const PromiseWatcherI = M.interface('PromiseWatcher', {
  onFulfilled: M.call(M.any()).rest(M.any()).returns(M.any()),
  onRejected: M.call(M.any()).rest(M.any()).returns(M.any()),
});

/**
 * @typedef {object} PromiseWatcher
 * @property {(...args: unknown[]) => void} [onFulfilled]
 * @property {(...args: unknown[]) => void} [onRejected]
 */

/** @type {(p: PromiseLike<any>, watcher: PromiseWatcher, ...args: unknown[]) => void} */
let watchPromise = /** @type {any} */ (globalThis).VatData?.watchPromise;
if (!watchPromise) {
  /**
   * Adapt a promise watcher method to E.when.
   * @param {Record<PropertyKey, (...args: unknown[]) => unknown>} that
   * @param {PropertyKey} prop
   * @param {unknown[]} postArgs
   */
  const callMeMaybe = (that, prop, postArgs) => {
    const fn = that[prop];
    if (typeof fn !== 'function') {
      return undefined;
    }
    /**
     * @param {unknown} arg value or reason
     */
    const wrapped = arg => {
      // Don't return a value, to prevent E.when from subscribing to a resulting
      // promise.
      fn.call(that, arg, ...postArgs);
    };
    return wrapped;
  };

  // Shim the promise watcher behaviour when VatData.watchPromise is not available.
  watchPromise = (p, watcher, ...args) => {
    const onFulfilled = callMeMaybe(watcher, 'onFulfilled', args);
    const onRejected = callMeMaybe(watcher, 'onRejected', args);
    onFulfilled ||
      onRejected ||
      Fail`promise watcher must implement at least one handler method`;
    void E.when(p, onFulfilled, onRejected);
  };
}

/**
 * @param {any} specimen
 * @param {import('./types.js').Watcher} watcher
 */
const watchWhenable = (specimen, watcher) => {
  let promise;
  const whenable0 = specimen && specimen.whenable0;
  if (whenable0) {
    promise = E(whenable0).shorten();
  } else {
    promise = E.resolve(specimen);
  }
  watchPromise(promise, watcher);
};

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {() => import('./types.js').WhenableKit<any>} makeWhenableKit
 * @param {(reason: any) => boolean} [rejectionMeansRetry]
 */
export const prepareWatch = (
  zone,
  makeWhenableKit,
  rejectionMeansRetry = () => false,
) => {
  const makeKit = makeWhenableKit || prepareWhenableKit(zone);

  /**
   * @param {import('./types.js').Settler} settler
   * @param {import('./types.js').Watcher} watcher
   * @param {'onFulfilled' | 'onRejected'} wcb
   * @param {unknown} value
   */
  const settle = (settler, watcher, wcb, value) => {
    try {
      let chainValue = value;
      const w = watcher[wcb];
      if (w) {
        chainValue = w(value);
      } else if (wcb === 'onRejected') {
        throw value;
      }
      settler && settler.resolve(chainValue);
    } catch (e) {
      if (settler) {
        settler.reject(e);
      } else {
        throw e;
      }
    }
  };
  const makeReconnectWatcher = zone.exoClass(
    'ReconnectWatcher',
    PromiseWatcherI,
    (whenable, watcher, settler) => ({
      whenable,
      watcher,
      settler,
    }),
    {
      /**
       * @param {any} value
       */
      onFulfilled(value) {
        const { watcher, settler } = this.state;
        if (value && value.whenable0) {
          // We've been shortened, so reflect our state accordingly, and go again.
          this.state.whenable = value;
          watchWhenable(this.state.whenable, this.self);
          return;
        }
        this.state.watcher = undefined;
        this.state.settler = undefined;
        if (watcher) {
          settle(settler, watcher, 'onFulfilled', value);
        } else if (settler) {
          settler.resolve(value);
        }
      },
      /**
       * @param {any} reason
       */
      onRejected(reason) {
        const { watcher, settler } = this.state;
        if (rejectionMeansRetry(reason)) {
          watchWhenable(this.state.whenable, this.self);
          return;
        }
        if (!watcher) {
          this.state.settler = undefined;
          settler && settler.reject(reason);
          return;
        }
        this.state.watcher = undefined;
        this.state.settler = undefined;
        if (watcher.onRejected) {
          settle(settler, watcher, 'onRejected', reason);
        } else if (settler) {
          settler.reject(reason);
        } else {
          throw reason; // for host's unhandled rejection handler to catch
        }
      },
    },
  );

  /**
   * @template T
   * @param {any} specimenP
   * @param {{ onFulfilled(value: T): void, onRejected(reason: any): void; }} [watcher]
   */
  const watch = (specimenP, watcher) => {
    const { settler, whenable } = makeKit();
    // Ensure we have a presence that won't be disconnected later.
    getFirstWhenable(specimenP, (specimen, whenable0) => {
      if (!whenable0) {
        // We're already as short as we can get.
        settler.resolve(specimen);
        return;
      }

      // Persistently watch the specimen.
      const reconnectWatcher = makeReconnectWatcher(specimen, watcher, settler);
      watchWhenable(specimen, reconnectWatcher);
    }).catch(e => settler.reject(e));

    return whenable;
  };
  harden(watch);

  return watch;
};

harden(prepareWatch);

/** @typedef {ReturnType<typeof prepareWatch>} Watch */
