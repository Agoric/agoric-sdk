// @ts-check
import { E } from '@endo/far';
import { M } from '@endo/patterns';

import { getWhenablePayload, getFirstWhenable } from './whenable-utils.js';

const { Fail } = assert;

const { apply } = Reflect;

export const PromiseWatcherI = M.interface('PromiseWatcher', {
  onFulfilled: M.call(M.any()).rest(M.any()).returns(),
  onRejected: M.call(M.any()).rest(M.any()).returns(),
});

/**
 * @typedef {object} PromiseWatcher
 * @property {(...args: unknown[]) => void} [onFulfilled]
 * @property {(...args: unknown[]) => void} [onRejected]
 */

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
    apply(fn, that, [arg, ...postArgs]);
  };
  return wrapped;
};

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {() => import('./types.js').WhenableKit<any>} makeWhenableKit
 * @param {(p: PromiseLike<any>, watcher: PromiseWatcher,
 *   ...args: unknown[]) => void} [watchPromise]
 * @param {(reason: any) => boolean} [rejectionMeansRetry]
 */
export const prepareWatch = (
  zone,
  makeWhenableKit,
  watchPromise,
  rejectionMeansRetry = () => false,
) => {
  if (!watchPromise) {
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
   * @param {PromiseWatcher} watcher
   */
  const watchWhenable = (specimen, watcher) => {
    let promise;
    const payload = getWhenablePayload(specimen);
    if (payload) {
      promise = E(payload.whenable0).shorten();
    } else {
      promise = E.resolve(specimen);
    }
    watchPromise(promise, watcher);
  };

  /**
   * @param {import('./types.js').Settler} settler
   * @param {import('./types.js').Watcher<unknown, unknown, unknown>} watcher
   * @param {keyof Required<import('./types.js').Watcher>} wcb
   * @param {unknown} value
   */
  const settle = (settler, watcher, wcb, value) => {
    try {
      let chainedValue = value;
      const w = watcher[wcb];
      if (w) {
        //
        chainedValue = apply(w, watcher, [value]);
      } else if (wcb === 'onRejected') {
        throw value;
      }
      settler && settler.resolve(chainedValue);
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
    /**
     * @template [T=any]
     * @template [TResult1=T]
     * @template [TResult2=never]
     * @param {import('./types.js').Whenable<T>} whenable
     * @param {import('./types.js').Settler<TResult1 | TResult2>} settler
     * @param {import('./types.js').Watcher<T, TResult1, TResult2>} [watcher]
     */
    (whenable, settler, watcher) => {
      const state = {
        whenable,
        settler,
        watcher,
      };
      return /** @type {Partial<typeof state>} */ (state);
    },
    {
      /** @type {Required<PromiseWatcher>['onFulfilled']} */
      onFulfilled(value) {
        const { watcher, settler } = this.state;
        if (getWhenablePayload(value)) {
          // We've been shortened, so reflect our state accordingly, and go again.
          const whenable = /** @type {import('./types.js').Whenable<any>} */ (
            value
          );
          this.state.whenable = whenable;
          watchWhenable(value, this.self);
          return undefined;
        }
        this.state.watcher = undefined;
        this.state.settler = undefined;
        if (!settler) {
          return undefined;
        } else if (watcher) {
          settle(settler, watcher, 'onFulfilled', value);
        } else {
          settler.resolve(value);
        }
      },
      /** @type {Required<PromiseWatcher>['onRejected']} */
      onRejected(reason) {
        const { watcher, settler } = this.state;
        if (rejectionMeansRetry(reason)) {
          watchWhenable(this.state.whenable, this.self);
          return;
        }
        this.state.settler = undefined;
        this.state.watcher = undefined;
        if (!watcher) {
          settler && settler.reject(reason);
        } else if (!settler) {
          throw reason; // for host's unhandled rejection handler to catch
        } else if (watcher.onRejected) {
          settle(settler, watcher, 'onRejected', reason);
        } else {
          settler.reject(reason);
        }
      },
    },
  );

  /**
   * @template T
   * @param {any} specimenP
   * @param {import('./types.js').Watcher<T>} [watcher]
   */
  const watch = (specimenP, watcher) => {
    const { settler, whenable } = makeWhenableKit();
    // Ensure we have a presence that won't be disconnected later.
    getFirstWhenable(specimenP, (specimen, whenable0) => {
      if (!whenable0) {
        // We're already as short as we can get.
        settler.resolve(specimen);
        return;
      }

      // Persistently watch the specimen.
      const reconnectWatcher = makeReconnectWatcher(specimen, settler, watcher);
      watchWhenable(specimen, reconnectWatcher);
    }).catch(e => settler.reject(e));

    return whenable;
  };
  harden(watch);

  return watch;
};

harden(prepareWatch);

/** @typedef {ReturnType<typeof prepareWatch>} Watch */
