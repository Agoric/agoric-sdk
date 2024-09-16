// @ts-check
import { makeAsVow } from './vow-utils.js';
import { prepareVowKit } from './vow.js';
import { prepareWatchUtils } from './watch-utils.js';
import { prepareWatch } from './watch.js';
import { makeWhen } from './when.js';

/**
 * @import {Zone} from '@agoric/base-zone';
 * @import {IsRetryableReason, AsPromiseFunction, EVow, Vow, ERef} from './types.js';
 */

/**
 * NB: Not to be used in a Vat. It doesn't know what an upgrade is. For that you
 * need `prepareVowTools` from `vat.js`.
 *
 * @param {Zone} zone
 * @param {object} [powers]
 * @param {IsRetryableReason} [powers.isRetryableReason]
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

  /**
   * TODO FIXME make this real
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

  /** @type {AsPromiseFunction} */
  const asPromise = (specimenP, ...watcherArgs) =>
    watchUtils.asPromise(specimenP, ...watcherArgs);

  return harden({
    when,
    watch,
    makeVowKit,
    all,
    allVows,
    asVow,
    asPromise,
    retriable,
  });
};
harden(prepareBasicVowTools);

/** @typedef {ReturnType<typeof prepareBasicVowTools>} VowTools */
