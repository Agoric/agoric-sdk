// @ts-check
import { getVowPayload, basicE } from './vow-utils.js';
import { PromiseWatcherI, watchPromiseShim } from './watch-promise.js';

const { apply } = Reflect;

/**
 * @param {typeof watchPromiseShim} watchPromise
 */
const makeWatchVow =
  watchPromise =>
  /**
   * @param {any} specimen
   * @param {import('./watch-promise.js').PromiseWatcher} promiseWatcher
   */
  (specimen, promiseWatcher) => {
    let promise;
    const payload = getVowPayload(specimen);
    if (payload) {
      promise = basicE(payload.vowV0).shorten();
    } else {
      promise = basicE.resolve(specimen);
    }
    watchPromise(promise, promiseWatcher);
  };

/**
 * @param {import('./types.js').VowResolver} resolver
 * @param {import('./types.js').Watcher<unknown, unknown, unknown>} watcher
 * @param {keyof Required<import('./types.js').Watcher>} wcb
 * @param {unknown} value
 */
const settle = (resolver, watcher, wcb, value) => {
  try {
    let chainedValue = value;
    const w = watcher[wcb];
    if (w) {
      chainedValue = apply(w, watcher, [value]);
    } else if (wcb === 'onRejected') {
      throw value;
    }
    resolver && resolver.resolve(chainedValue);
  } catch (e) {
    if (resolver) {
      resolver.reject(e);
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
const preparePromiseWatcher = (zone, rejectionMeansRetry, watchVow) =>
  zone.exoClass(
    'PromiseWatcher',
    PromiseWatcherI,
    /**
     * @template [T=any]
     * @template [TResult1=T]
     * @template [TResult2=never]
     * @param {import('./types.js').VowResolver<TResult1 | TResult2>} resolver
     * @param {import('./types.js').Watcher<T, TResult1, TResult2>} [watcher]
     */
    (resolver, watcher) => {
      const state = {
        vow: /** @type {unknown} */ (undefined),
        resolver,
        watcher,
      };
      return /** @type {Partial<typeof state>} */ (state);
    },
    {
      /** @type {Required<import('./watch-promise.js').PromiseWatcher>['onFulfilled']} */
      onFulfilled(value) {
        const { watcher, resolver } = this.state;
        if (getVowPayload(value)) {
          // We've been shortened, so reflect our state accordingly, and go again.
          this.state.vow = value;
          watchVow(value, this.self);
          return undefined;
        }
        this.state.watcher = undefined;
        this.state.resolver = undefined;
        if (!resolver) {
          return undefined;
        } else if (watcher) {
          settle(resolver, watcher, 'onFulfilled', value);
        } else {
          resolver.resolve(value);
        }
      },
      /** @type {Required<import('./watch-promise.js').PromiseWatcher>['onRejected']} */
      onRejected(reason) {
        const { vow, watcher, resolver } = this.state;
        if (vow && rejectionMeansRetry(reason)) {
          watchVow(vow, this.self);
          return;
        }
        this.state.resolver = undefined;
        this.state.watcher = undefined;
        if (!watcher) {
          resolver && resolver.reject(reason);
        } else if (!resolver) {
          throw reason; // for host's unhandled rejection handler to catch
        } else if (watcher.onRejected) {
          settle(resolver, watcher, 'onRejected', reason);
        } else {
          resolver.reject(reason);
        }
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
  const makePromiseWatcher = preparePromiseWatcher(
    zone,
    rejectionMeansRetry,
    watchVow,
  );

  /**
   * @template [T=any]
   * @template [TResult1=T]
   * @template [TResult2=T]
   * @param {import('./types.js').ERef<T | import('./types.js').Vow<T>>} specimenP
   * @param {import('./types.js').Watcher<T, TResult1, TResult2>} [watcher]
   */
  const watch = (specimenP, watcher) => {
    /** @type {import('./types.js').VowKit<TResult1 | TResult2>} */
    const { resolver, vow } = makeVowKit();

    // Create a promise watcher to track vows, retrying on disconnection.
    const promiseWatcher = makePromiseWatcher(resolver, watcher);

    // Coerce the specimen to a promise, and start the watcher cycle.
    watchPromise(basicE.resolve(specimenP), promiseWatcher);

    return vow;
  };
  harden(watch);

  return watch;
};

harden(prepareWatch);

/** @typedef {ReturnType<typeof prepareWatch>} Watch */
