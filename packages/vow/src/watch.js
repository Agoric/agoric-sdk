// @ts-check
import { PromiseWatcherI } from '@agoric/base-zone';
import { getVowPayload, basicE } from './vow-utils.js';

const { apply } = Reflect;

/**
 * @import { PromiseWatcher, Zone } from '@agoric/base-zone';
 * @import { EVow, IsRetryableReason, VowKit, VowResolver, Watcher } from './types.js';
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
 * @param {unknown[]} [watcherArgs]
 */
const settle = async (resolver, watcher, wcb, value, watcherArgs = []) => {
  await null;
  try {
    let chainedValue = value;
    const w = watcher && watcher[wcb];
    if (w) {
      chainedValue = apply(w, watcher, [value, ...watcherArgs]);
    } else if (wcb === 'onRejected') {
      throw value;
    }

    if (resolver) {
      resolver.resolve(chainedValue);
      return;
    }

    // We want to propagate rejections (but not fulfillment values) to our
    // caller if no resolver was provided.
    await chainedValue;
  } catch (e) {
    if (resolver) {
      resolver.reject(e);
      return;
    }

    // Create a native unhandled rejection.
    throw e;
  }
};

/**
 * @param {Zone} zone
 * @param {IsRetryableReason} isRetryableReason
 * @param {ReturnType<typeof makeWatchNextStep>} watchNextStep
 */
const preparePromiseWatcher = (zone, isRetryableReason, watchNextStep) => {
  // We use an ephemeral WeakSet for the previously seen vows in a watch operation
  // While watch is durable, it suffices to detect the cycle in a single incarnation
  /** @type {WeakMap<PromiseWatcher, WeakSet<any>>} */
  const watcherSeenPayloads = new WeakMap();

  /** @param {PromiseWatcher} watcher */
  const getSeenPayloads = watcher => {
    let seenPayloads = watcherSeenPayloads.get(watcher);
    if (!seenPayloads) {
      seenPayloads = new WeakSet();
      watcherSeenPayloads.set(watcher, seenPayloads);
    }
    return seenPayloads;
  };

  return zone.exoClass(
    'PromiseWatcher',
    PromiseWatcherI,
    /**
     * @template [T=any]
     * @template [TResult1=T]
     * @template [TResult2=never]
     * @param {VowResolver<TResult1 | TResult2>} resolver
     * @param {Watcher<T, TResult1, TResult2>} [watcher]
     * @param {unknown[]} [watcherArgs]
     */
    (resolver, watcher, watcherArgs) => {
      const state = {
        vow: /** @type {unknown} */ (undefined),
        priorRetryValue: /** @type {any} */ (undefined),
        resolver,
        watcher,
        watcherArgs: harden(watcherArgs),
      };
      return /** @type {Partial<typeof state>} */ (state);
    },
    {
      /** @type {Required<PromiseWatcher>['onFulfilled']} */
      onFulfilled(value) {
        const { watcher, watcherArgs, resolver } = this.state;
        if (!resolver) {
          throw Error('Unexpected multiple calls to PromiseWatcher');
        }
        const payload = getVowPayload(value);
        if (payload) {
          const seenPayloads = getSeenPayloads(this.self);
          // TODO: rely on endowed helper to get storable cap from payload
          if (seenPayloads.has(payload.vowV0)) {
            return this.self.onRejected(Error('Vow resolution cycle detected'));
          }
          seenPayloads.add(payload.vowV0);
          // We've been shortened, so reflect our state accordingly, and go again.
          this.state.vow = value;
          watchNextStep(value, this.self);
          return;
        }
        watcherSeenPayloads.delete(this.self);
        this.state.priorRetryValue = undefined;
        this.state.watcher = undefined;
        this.state.resolver = undefined;
        void settle(resolver, watcher, 'onFulfilled', value, watcherArgs);
      },
      /** @type {Required<PromiseWatcher>['onRejected']} */
      onRejected(reason) {
        const { vow, watcher, watcherArgs, resolver, priorRetryValue } =
          this.state;
        if (!resolver) {
          throw Error('Unexpected multiple calls to PromiseWatcher');
        }
        const retryValue = isRetryableReason(reason, priorRetryValue);
        if (retryValue) {
          this.state.priorRetryValue = retryValue;
          if (vow) {
            // Retry the same specimen.
            watchNextStep(vow, this.self);
            return;
          }
        }
        // Final rejection.
        watcherSeenPayloads.delete(this.self);
        this.state.priorRetryValue = undefined;
        this.state.resolver = undefined;
        this.state.watcher = undefined;
        void settle(resolver, watcher, 'onRejected', reason, watcherArgs);
      },
    },
  );
};

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
   * @template {any[]} [C=any[]] watcher args
   * @param {EVow<T>} specimenP
   * @param {Watcher<T, TResult1, TResult2, C>} [watcher]
   * @param {C} watcherArgs
   */
  const watch = (specimenP, watcher, ...watcherArgs) => {
    /** @typedef {Exclude<TResult1, void> | Exclude<TResult2, void>} Voidless */
    /** @typedef {Voidless extends never ? TResult1 : Voidless} Narrowest */
    /** @type {VowKit<Narrowest>} */
    const { resolver, vow } = makeVowKit();

    // Create a promise watcher to track vows, retrying upon rejection as
    // controlled by `isRetryableReason`.
    const promiseWatcher = makePromiseWatcher(resolver, watcher, watcherArgs);

    // Coerce the specimen to a promise, and start the watcher cycle.
    const promise = basicE.resolve(specimenP);
    zone.watchPromise(promise, promiseWatcher);

    return vow;
  };
  harden(watch);

  return watch;
};

harden(prepareWatch);

/** @typedef {ReturnType<typeof prepareWatch>} Watch */
