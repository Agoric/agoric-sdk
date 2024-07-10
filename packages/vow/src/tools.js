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
export const prepareVowTools = (zone, powers = {}) => {
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
   * Vow-tolerant implementation of Promise.all.
   *
   * @param {EVow<unknown>[]} maybeVows
   */
  const allVows = maybeVows => watchUtils.all(maybeVows);

  /** @type {AsPromiseFunction} */
  const asPromise = (specimenP, ...watcherArgs) =>
    watchUtils.asPromise(specimenP, ...watcherArgs);

  return harden({
    when,
    watch,
    makeVowKit,
    allVows,
    asVow,
    asPromise,
    retriable,
  });
};
harden(prepareVowTools);

/** @typedef {ReturnType<typeof prepareVowTools>} VowTools */
