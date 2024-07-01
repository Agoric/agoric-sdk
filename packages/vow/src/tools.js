// @ts-check
import { makeWhen } from './when.js';
import { prepareVowKit } from './vow.js';
import { prepareWatch } from './watch.js';
import { prepareWatchUtils } from './watch-utils.js';
import { makeAsVow } from './vow-utils.js';

/** @import {Zone} from '@agoric/base-zone' */
/** @import {IsRetryableReason} from './types.js' */

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
  const makeWatchUtils = prepareWatchUtils(zone, watch, makeVowKit);
  const watchUtils = makeWatchUtils();
  const asVow = makeAsVow(makeVowKit);

  /**
   * Vow-tolerant implementation of Promise.all.
   *
   * @param {unknown[]} vows
   */
  const allVows = vows => watchUtils.all(vows);

  return harden({ when, watch, makeVowKit, allVows, asVow });
};
harden(prepareVowTools);

/** @typedef {ReturnType<typeof prepareVowTools>} VowTools */
