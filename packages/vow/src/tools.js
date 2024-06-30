// @ts-check
import { makeWhen } from './when.js';
import { prepareVowKit } from './vow.js';
import { prepareWatch } from './watch.js';
import { prepareWatchUtils } from './watch-utils.js';
import { makeAsVow } from './vow-utils.js';

/**
 * @import {Zone} from '@agoric/base-zone';
 * @import {IsRetryableReason, AsPromiseFunction, EVow} from './types.js';
 */

/**
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
   * @param {string} name
   * @param {(...args: unknown[]) => unknown} fn
   */
  const retriable =
    (name, fn) =>
      (...args) =>
        watch(fn(...args));

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
