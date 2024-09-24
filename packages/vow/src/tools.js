// @ts-check
import { makeAsVow } from './vow-utils.js';
import { prepareVowKit } from './vow.js';
import { prepareWatchUtils } from './watch-utils.js';
import { prepareWatch } from './watch.js';
import { makeWhen } from './when.js';

/**
 * @import {Zone} from '@agoric/base-zone';
 * @import {Passable} from '@endo/pass-style';
 * @import {EUnwrap, IsRetryableReason, AsPromiseFunction, Vow, VowKit, EVow, PromiseVow, Watcher} from './types.js';
 */

/**
 * @typedef VowTools
 * @property {(maybeVows: unknown[]) => Vow<any[]>} all Vow-tolerant implementation of Promise.all that takes an iterable of vows
 * and other {@link Passable}s and returns a single {@link Vow}. It resolves
 * with an array of values when all of the input's promises or vows are
 * fulfilled and rejects when any of the input's promises or vows are rejected
 * with the first rejection reason.
 * @property {(maybeVows: unknown[]) => Vow<({status: 'fulfilled', value: any} |
 * {status: 'rejected', reason: any})[]>} allSettled Vow-tolerant
 * implementation of Promise.allSettled that takes an iterable of vows and other
 * {@link Passable}s and returns a single {@link Vow}. It resolves when all of
 * the input's promises or vows are settled with an array of settled outcome
 * objects.
 * @property {(maybeVows: unknown[]) => Vow<any[]>} allVows
 * @property {AsPromiseFunction} asPromise Convert a vow or promise to a promise, ensuring proper handling of ephemeral promises.
 * @property {<T extends unknown>(fn: (...args: any[]) => Vow<Awaited<T>> |
 * Awaited<T> | PromiseVow<T>) => Vow<Awaited<T>>} asVow Helper function that
 * coerces the result of a function to a Vow. Helpful for scenarios like a
 * synchronously thrown error.
 * @property {<T>() => VowKit<T>} makeVowKit
 * @property {<F extends (...args: any[]) => Promise<any>>(fnZone: Zone, name: string, fn: F) => F extends (...args: infer Args) => Promise<infer R> ? (...args: Args) => Vow<R> : never} retriable
 * @property {<T = any, TResult1 = T, TResult2 = never, C extends any[] = any[]>(specimenP: EVow<T>, watcher?: Watcher<T, TResult1, TResult2, C> | undefined, ...watcherArgs: C) => Vow<Exclude<TResult1, void> | Exclude<TResult2, void> extends never ? TResult1 : Exclude<TResult1, void> | Exclude<TResult2, void>>} watch
 * @property {<T, TResult1 = EUnwrap<T>, TResult2 = never>(specimenP: T, onFulfilled?: ((value: EUnwrap<T>) => TResult1 | PromiseLike<TResult1>) | undefined, onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined) => Promise<TResult1 | TResult2>} when Shorten `specimenP` until we achieve a final result.
 *
 * Does not survive upgrade (even if specimenP is a durable Vow).
 *
 * Use only if the Vow will resolve _promptly_.
 */

/**
 * NB: Not to be used in a Vat. It doesn't know what an upgrade is. For that you
 * need `prepareVowTools` from `vat.js`.
 *
 * @param {Zone} zone
 * @param {object} [powers]
 * @param {IsRetryableReason} [powers.isRetryableReason]
 * @returns {VowTools}
 */
export const prepareBasicVowTools = (zone, powers = {}) => {
  const { isRetryableReason = /** @type {IsRetryableReason} */ (() => false) } =
    powers;
  const makeVowKit = prepareVowKit(zone);
  const when = makeWhen(isRetryableReason);
  const watch = prepareWatch(zone, makeVowKit, isRetryableReason);
  const makeWatchUtils = prepareWatchUtils(zone, {
    watch,
    when,
    makeVowKit,
    isRetryableReason,
  });
  const watchUtils = makeWatchUtils();
  const asVow = makeAsVow(makeVowKit);

  // FIXME in https://github.com/Agoric/agoric-sdk/pull/9785
  /**
   * @alpha Not yet implemented
   *
   * Create a function that retries the given function if the underlying
   * functions rejects due to upgrade disconnection.
   *
   * @template {(...args: any[]) => Promise<any>} F
   * @param {Zone} fnZone - the zone for the named function
   * @param {string} name
   * @param {F} fn
   * @returns {F extends (...args: infer Args) => Promise<infer R> ? (...args: Args) => Vow<R> : never}
   */
  const retriable =
    (fnZone, name, fn) =>
    // @ts-expect-error cast
    (...args) => {
      return watch(fn(...args));
    };

  /**
   * Vow-tolerant implementation of Promise.all that takes an iterable of vows
   * and other {@link Passable}s and returns a single {@link Vow}. It resolves
   * with an array of values when all of the input's promises or vows are
   * fulfilled and rejects when any of the input's promises or vows are
   * rejected with the first rejection reason.
   *
   * @param {unknown[]} maybeVows
   */
  const all = maybeVows => watchUtils.all(maybeVows);

  /**
   * @param {unknown[]} maybeVows
   * @deprecated use `vowTools.all`
   */
  const allVows = all;

  /**
   * Vow-tolerant implementation of Promise.allSettled that takes an iterable
   * of vows and other {@link Passable}s and returns a single {@link Vow}. It
   * resolves when all of the input's promises or vows are settled with an
   * array of settled outcome objects.
   *
   * @param {unknown[]} maybeVows
   */
  const allSettled = maybeVows => watchUtils.allSettled(maybeVows);

  /** @type {AsPromiseFunction} */
  const asPromise = (specimenP, ...watcherArgs) =>
    watchUtils.asPromise(specimenP, ...watcherArgs);

  return harden({
    when,
    watch,
    makeVowKit,
    all,
    allVows,
    allSettled,
    asVow,
    asPromise,
    retriable,
  });
};
harden(prepareBasicVowTools);
