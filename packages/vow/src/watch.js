// @ts-check
import { M } from '@endo/patterns';

import { getVowPayload, unwrapPromise, basicE } from './vow-utils.js';
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
     * @param {import('./types.js').VowResolver<TResult1 | TResult2>} resolver
     * @param {import('./types.js').Watcher<T, TResult1, TResult2>} [watcher]
     */
    (resolver, watcher) => {
      const state = {
        vow: undefined,
        resolver,
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
        /** @type {Required<import('./watch-promise.js').PromiseWatcher>['onFulfilled']} */
        onFulfilled(value) {
          const { watcher, resolver } = this.state;
          if (getVowPayload(value)) {
            // We've been shortened, so reflect our state accordingly, and go again.
            this.facets.vowSetter.setVow(value);
            watchVow(value, this.facets.promiseWatcher);
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
          const { watcher, resolver } = this.state;
          if (rejectionMeansRetry(reason)) {
            watchVow(this.state.vow, this.facets.promiseWatcher);
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
    const { resolver, vow } = makeVowKit();

    const { promiseWatcher, vowSetter } = makeWatcherKit(resolver, watcher);

    // Ensure we have a presence that won't be disconnected later.
    unwrapPromise(specimenP, (specimen, payload) => {
      vowSetter.setVow(specimen);
      // Persistently watch the specimen.
      if (!payload) {
        // Specimen is not a vow.
        promiseWatcher.onFulfilled(specimen);
        return;
      }
      watchVow(specimen, promiseWatcher);
    }).catch(e => promiseWatcher.onRejected(e));

    return vow;
  };
  harden(watch);

  return watch;
};

harden(prepareWatch);

/** @typedef {ReturnType<typeof prepareWatch>} Watch */
