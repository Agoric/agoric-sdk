// @ts-check
import { E } from '@endo/far';
import { M } from '@endo/patterns';

import { getWhenablePayload, unwrapPromise } from './whenable-utils.js';

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
  if (!fn) {
    return undefined;
  }
  assert.typeof(fn, 'function');
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
 * Shim the promise watcher behaviour when VatData.watchPromise is not available.
 *
 * @param {Promise<any>} p
 * @param {PromiseWatcher} watcher
 * @param {...unknown[]} watcherArgs
 * @returns {void}
 */
const watchPromiseShim = (p, watcher, ...watcherArgs) => {
  Promise.resolve(p) === p || Fail`watchPromise only watches promises`;
  const onFulfilled = callMeMaybe(watcher, 'onFulfilled', watcherArgs);
  const onRejected = callMeMaybe(watcher, 'onRejected', watcherArgs);
  onFulfilled ||
    onRejected ||
    Fail`promise watcher must implement at least one handler method`;
  void E.when(p, onFulfilled, onRejected);
};

/**
 * @param {typeof watchPromiseShim} watchPromise
 */
const makeWatchWhenable =
  watchPromise =>
  /**
   * @param {any} specimen
   * @param {PromiseWatcher} promiseWatcher
   */
  (specimen, promiseWatcher) => {
    let promise;
    const payload = getWhenablePayload(specimen);
    if (payload) {
      promise = E(payload.whenableV0).shorten();
    } else {
      promise = E.resolve(specimen);
    }
    watchPromise(promise, promiseWatcher);
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

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {(reason: any) => boolean} rejectionMeansRetry
 * @param {ReturnType<typeof makeWatchWhenable>} watchWhenable
 */
const prepareWatcherKit = (zone, rejectionMeansRetry, watchWhenable) =>
  zone.exoClassKit(
    'PromiseWatcher',
    {
      promiseWatcher: PromiseWatcherI,
      whenableSetter: M.interface('whenableSetter', {
        setWhenable: M.call(M.any()).returns(),
      }),
    },
    /**
     * @template [T=any]
     * @template [TResult1=T]
     * @template [TResult2=never]
     * @param {import('./types.js').Settler<TResult1 | TResult2>} settler
     * @param {import('./types.js').Watcher<T, TResult1, TResult2>} [watcher]
     */
    (settler, watcher) => {
      const state = {
        whenable: undefined,
        settler,
        watcher,
      };
      return /** @type {Partial<typeof state>} */ (state);
    },
    {
      whenableSetter: {
        /** @param {any} whenable */
        setWhenable(whenable) {
          this.state.whenable = whenable;
        },
      },
      promiseWatcher: {
        /** @type {Required<PromiseWatcher>['onFulfilled']} */
        onFulfilled(value) {
          const { watcher, settler } = this.state;
          if (getWhenablePayload(value)) {
            // We've been shortened, so reflect our state accordingly, and go again.
            this.facets.whenableSetter.setWhenable(value);
            watchWhenable(value, this.facets.promiseWatcher);
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
            watchWhenable(this.state.whenable, this.facets.promiseWatcher);
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
    },
  );

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {() => import('./types.js').WhenableKit<any>} makeWhenableKit
 * @param {typeof watchPromiseShim} [watchPromise]
 * @param {(reason: any) => boolean} [rejectionMeansRetry]
 */
export const prepareWatch = (
  zone,
  makeWhenableKit,
  watchPromise = watchPromiseShim,
  rejectionMeansRetry = _reason => false,
) => {
  const watchWhenable = makeWatchWhenable(watchPromise);
  const makeWatcherKit = prepareWatcherKit(
    zone,
    rejectionMeansRetry,
    watchWhenable,
  );

  /**
   * @template T
   * @param {any} specimenP
   * @param {import('./types.js').Watcher<T>} [watcher]
   */
  const watch = (specimenP, watcher) => {
    const { settler, whenable } = makeWhenableKit();

    const { promiseWatcher, whenableSetter } = makeWatcherKit(settler, watcher);

    // Ensure we have a presence that won't be disconnected later.
    unwrapPromise(specimenP, (specimen, payload) => {
      whenableSetter.setWhenable(specimen);
      // Persistently watch the specimen.
      if (!payload) {
        // Specimen is not a whenable.
        promiseWatcher.onFulfilled(specimen);
        return;
      }
      watchWhenable(specimen, promiseWatcher);
    }).catch(e => promiseWatcher.onRejected(e));

    return whenable;
  };
  harden(watch);

  return watch;
};

harden(prepareWatch);

/** @typedef {ReturnType<typeof prepareWatch>} Watch */
