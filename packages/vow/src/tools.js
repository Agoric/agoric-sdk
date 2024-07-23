// @ts-check
import { makeAsVow } from './vow-utils.js';
import { prepareVowKit } from './vow.js';
import { prepareWatchUtils } from './watch-utils.js';
import { prepareWatch } from './watch.js';
import { prepareRetriableTools } from './retriable.js';
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

  const { retriable } = prepareRetriableTools(zone, {
    makeVowKit,
    isRetryableReason,
  });

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
harden(prepareBasicVowTools);

/** @typedef {ReturnType<typeof prepareBasicVowTools>} VowTools */
