// @ts-check
import { PromiseWatcherI } from '@agoric/base-zone';
import { getVowPayload, basicE } from './vow-utils.js';

const { apply } = Reflect;

/**
 * @import { PromiseWatcher, Zone } from '@agoric/base-zone';
 * @import { ERef, IsRetryableReason, Vow, VowKit, VowResolver, Watcher } from './types.js';
 */

/**
 * @param {Zone} zone
 */
const makeWatchNextStep =
  zone =>
  /**
   * If the specimen is a vow, obtain a fresh shortened promise from it,
   * otherwise coerce the non-vow specimen to a promise.  Then, associate a
   * (usually durable) watcher object with the promise.
   *
   * @param {any} specimen
   * @param {PromiseWatcher} promiseWatcher
   */
  (specimen, promiseWatcher) => {
    let promise;
    const payload = getVowPayload(specimen);
    if (payload) {
      promise = basicE(payload.vowV0).shorten();
    } else {
      promise = basicE.resolve(specimen);
    }
    zone.watchPromise(promise, promiseWatcher);
  };

/**
 * @param {VowResolver | undefined} resolver
 * @param {Watcher<unknown, unknown, unknown> | undefined} watcher
 * @param {keyof Required<Watcher>} wcb
 * @param {unknown} value
 * @param {unknown} [watcherContext]
 */
const settle = (resolver, watcher, wcb, value, watcherContext) => {
  try {
    let chainedValue = value;
    const w = watcher && watcher[wcb];
    if (w) {
      chainedValue = apply(w, watcher, [value, watcherContext]);
    } else if (wcb === 'onRejected') {
      throw value;
    }
    resolver && resolver.resolve(chainedValue);
  } catch (e) {
    if (resolver) {
      resolver.reject(e);
    } else {
      // for host's unhandled rejection handler to catch
      throw e;
    }
  }
};

/**
 * @param {Zone} zone
 * @param {IsRetryableReason} isRetryableReason
 * @param {ReturnType<typeof makeWatchNextStep>} watchNextStep
 */
const preparePromiseWatcher = (zone, isRetryableReason, watchNextStep) =>
  zone.exoClass(
    'PromiseWatcher',
    PromiseWatcherI,
    /**
     * @template [T=any]
     * @template [TResult1=T]
     * @template [TResult2=never]
     * @param {VowResolver<TResult1 | TResult2>} resolver
     * @param {Watcher<T, TResult1, TResult2>} [watcher]
     * @param {unknown} [watcherContext]
     */
    (resolver, watcher, watcherContext) => {
      const state = {
        vow: /** @type {unknown} */ (undefined),
        priorRetryValue: /** @type {any} */ (undefined),
        resolver,
        watcher,
        watcherContext: harden(watcherContext),
      };
      return /** @type {Partial<typeof state>} */ (state);
    },
    {
      /** @type {Required<PromiseWatcher>['onFulfilled']} */
      onFulfilled(value) {
        const { watcher, watcherContext, resolver } = this.state;
        if (getVowPayload(value)) {
          // We've been shortened, so reflect our state accordingly, and go again.
          this.state.vow = value;
          watchNextStep(value, this.self);
          return;
        }
        this.state.priorRetryValue = undefined;
        this.state.watcher = undefined;
        this.state.resolver = undefined;
        settle(resolver, watcher, 'onFulfilled', value, watcherContext);
      },
      /** @type {Required<PromiseWatcher>['onRejected']} */
      onRejected(reason) {
        const { vow, watcher, watcherContext, resolver, priorRetryValue } =
          this.state;
        if (vow) {
          const retryValue = isRetryableReason(reason, priorRetryValue);
          if (retryValue) {
            // Retry the same specimen.
            this.state.priorRetryValue = retryValue;
            watchNextStep(vow, this.self);
            return;
          }
        }
        this.state.priorRetryValue = undefined;
        this.state.resolver = undefined;
        this.state.watcher = undefined;
        settle(resolver, watcher, 'onRejected', reason, watcherContext);
      },
    },
  );

/**
 * @param {Zone} zone
 * @param {() => VowKit<any>} makeVowKit
 * @param {(reason: any, lastValue: any) => any} [isRetryableReason]
 */
export const prepareWatch = (
  zone,
  makeVowKit,
  isRetryableReason = (_reason, _lastValue) => undefined,
) => {
  const watchNextStep = makeWatchNextStep(zone);
  const makePromiseWatcher = preparePromiseWatcher(
    zone,
    isRetryableReason,
    watchNextStep,
  );

  /**
   * @template [T=any]
   * @template [TResult1=T]
   * @template [TResult2=never]
   * @template [C=any] watcher context
   * @param {ERef<T | Vow<T>>} specimenP
   * @param {Watcher<T, TResult1, TResult2>} [watcher]
   * @param {C} [watcherContext]
   */
  const watch = (specimenP, watcher, watcherContext) => {
    /** @typedef {Exclude<TResult1, void> | Exclude<TResult2, void>} Voidless */
    /** @typedef {Voidless extends never ? TResult1 : Voidless} Narrowest */
    /** @type {VowKit<Narrowest>} */
    const { resolver, vow } = makeVowKit();

    // Create a promise watcher to track vows, retrying upon rejection as
    // controlled by `isRetryableReason`.
    const promiseWatcher = makePromiseWatcher(
      resolver,
      watcher,
      watcherContext,
    );

    // Coerce the specimen to a promise, and start the watcher cycle.
    zone.watchPromise(basicE.resolve(specimenP), promiseWatcher);

    return vow;
  };
  harden(watch);

  return watch;
};

harden(prepareWatch);

/** @typedef {ReturnType<typeof prepareWatch>} Watch */
