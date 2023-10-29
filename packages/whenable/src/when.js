// @ts-check
/* global globalThis */
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { isUpgradeDisconnection } from '@agoric/internal/src/upgrade-api.js';

const { Fail } = assert;

export const PromiseWatcherI = M.interface('PromiseWatcher', {
  onFulfilled: M.call(M.any()).rest(M.any()).returns(M.any()),
  onRejected: M.call(M.any()).rest(M.any()).returns(M.any()),
});

/**
 * @template [T=any]
 * @typedef {{ whenable0: { shorten(): Promise<T | Whenable<T>>} }} Whenable
 */

/**
 * @typedef {object} Watcher
 * @property {(...args: unknown[]) => void} [onFulfilled]
 * @property {(...args: unknown[]) => void} [onRejected]
 */

/** @type {(p: PromiseLike<any>, watcher: Watcher, ...args: unknown[]) => void} */
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
 * @param {Watcher} watcher
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
 */
export const prepareWhen = zone => {
  const makeReconnectWatcher = zone.exoClass(
    'ReconnectWatcher',
    PromiseWatcherI,
    (whenable, watcher) => ({
      whenable,
      watcher,
    }),
    {
      /**
       * @param {any} value
       */
      onFulfilled(value) {
        const { watcher } = this.state;
        if (!watcher) {
          return;
        }
        if (value && value.whenable0) {
          // We've been shortened, so reflect our state accordingly, and go again.
          this.state.whenable = value;
          watchWhenable(this.state.whenable, this.self);
          return;
        }
        this.state.watcher = undefined;
        if (watcher.onFulfilled) {
          watcher.onFulfilled(value);
        }
      },
      /**
       * @param {any} reason
       */
      onRejected(reason) {
        const { watcher } = this.state;
        if (!watcher) {
          return;
        }
        if (isUpgradeDisconnection(reason)) {
          watchWhenable(this.state.whenable, this.self);
          return;
        }
        this.state.watcher = undefined;
        if (watcher.onRejected) {
          watcher.onRejected(reason);
        } else {
          throw reason; // for host's unhandled rejection handler to catch
        }
      },
    },
  );

  /**
   * @template T
   * @param {import('@endo/far').ERef<Whenable<T> | T>} whenableP
   * @param {{ onFulfilled(value: T): void, onRejected(reason: any): void; }} [watcher]
   */
  const when = async (whenableP, watcher) => {
    // Ensure we have a presence that won't be disconnected later.
    /** @type {any} */
    let specimen = await whenableP;
    if (!watcher) {
      // Shorten the whenable chain without a watcher.
      while (specimen && specimen.whenable0) {
        specimen = await E(specimen.whenable0).shorten();
      }
      return /** @type {T} */ (specimen);
    }
    const reconnectWatcher = makeReconnectWatcher(specimen, watcher);
    watchWhenable(specimen, reconnectWatcher);
    return /** @type {T} */ ('`when(p, watcher)` has no useful return value');
  };
  harden(when);

  return when;
};

harden(prepareWhen);

/** @typedef {ReturnType<typeof prepareWhen>} When */
