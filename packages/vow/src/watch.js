// @ts-check
import { M } from '@endo/patterns';

import { getVowPayload, basicE } from './vow-utils.js';

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
  void basicE.when(p, onFulfilled, onRejected);
};

/**
 * @param {typeof watchPromiseShim} watchPromise
 */
const makeWatchVow = watchPromise => {
  /**
   * @param {any} specimen
   * @param {PromiseWatcher} promiseWatcher
   */
  const watchVow = (specimen, promiseWatcher) => {
    let promise;
    const payload = getVowPayload(specimen);
    if (payload) {
      promise = basicE(payload.vowV0).shorten();
    } else {
      promise = basicE.resolve(specimen);
    }
    watchPromise(promise, promiseWatcher);
  };
  return watchVow;
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
 * @param {ReturnType<typeof makeWatchVow>} watchVow
 */
const prepareWatcherKit = (zone, rejectionMeansRetry, watchVow) =>
  zone.exoClassKit(
    'PromiseWatcher',
    {
      promiseWatcher: PromiseWatcherI,
      vowSetter: M.interface('vowSetter', {
        setVow: M.call(M.any()).returns(),
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
        vow: undefined,
        settler,
        watcher,
      };
      return /** @type {Partial<typeof state>} */ (state);
    },
    {
      vowSetter: {
        /** @param {any} vow */
        setVow(vow) {
          this.state.vow = vow;
        },
      },
      promiseWatcher: {
        /** @type {Required<PromiseWatcher>['onFulfilled']} */
        onFulfilled(value) {
          const { watcher, settler } = this.state;
          if (getVowPayload(value)) {
            // We've been shortened, so reflect our state accordingly, and go again.
            this.facets.vowSetter.setVow(value);
            watchVow(value, this.facets.promiseWatcher);
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
            watchVow(this.state.vow, this.facets.promiseWatcher);
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
 * @param {() => import('./types.js').VowKit<any>} makeVowKit
 * @param {typeof watchPromiseShim} [watchPromise]
 * @param {(reason: any) => boolean} [rejectionMeansRetry]
 */
export const prepareWatch = (
  zone,
  makeVowKit,
  watchPromise = watchPromiseShim,
  rejectionMeansRetry = _reason => false,
) => {
  const watchVow = makeWatchVow(watchPromise);
  const makeWatcherKit = prepareWatcherKit(zone, rejectionMeansRetry, watchVow);

  /**
   * @template [T=any]
   * @template [TResult1=T]
   * @template [TResult2=T]
   * @param {import('./types.js').ERef<T | import('./types.js').Vow<T>>} specimenP
   * @param {import('./types.js').Watcher<T, TResult1, TResult2>} [watcher]
   */
  const watch = (specimenP, watcher) => {
    /** @type {import('./types.js').VowKit<TResult1 | TResult2>} */
    const { settler, vow } = makeVowKit();

    const { promiseWatcher, vowSetter } = makeWatcherKit(settler, watcher);

    if (getVowPayload(specimenP)) {
      vowSetter.setVow(specimenP);
    } else {
      // TODO: Eat less of our own tail.
      const {
        settler: { resolve, reject },
        vow: specimenVow,
      } = makeVowKit();
      basicE.when(specimenP, resolve, reject).catch(() => {});
      vowSetter.setVow(specimenVow);
    }
    watchVow(specimenP, promiseWatcher);

    return vow;
  };
  harden(watch);

  return watch;
};

harden(prepareWatch);

/** @typedef {ReturnType<typeof prepareWatch>} Watch */
