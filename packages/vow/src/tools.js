// @ts-check
import { makeWhen } from './when.js';
import { prepareVowKit } from './vow.js';
import { prepareWatch } from './watch.js';
import { prepareWatchUtils } from './watch-utils.js';

/** @import {Zone} from '@agoric/base-zone' */

/**
 * @param {Zone} zone
 * @param {object} [powers]
 * @param {(reason: any) => boolean} [powers.isRetryableReason]
 */
export const prepareVowTools = (zone, powers = {}) => {
  const { isRetryableReason = () => false } = powers;
  const makeVowKit = prepareVowKit(zone);
  const when = makeWhen(isRetryableReason);
  const watch = prepareWatch(zone, makeVowKit, isRetryableReason);
  const makeWatchUtils = prepareWatchUtils(zone, watch, makeVowKit);
  const watchUtils = makeWatchUtils();

  /**
   * Vow-tolerant implementation of Promise.all.
   *
   * @param {unknown[]} vows
   */
  const allVows = vows => watchUtils.all(vows);

  return harden({ when, watch, makeVowKit, allVows });
};
harden(prepareVowTools);
