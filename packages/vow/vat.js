/**
 * @file specialization of the `@agoric/vow` package for the vat disconnection rejections produced by
 * the SwingSet kernel.
 */

/* global globalThis */
// @ts-check
import {
  isUpgradeDisconnection,
  isAbandonedError,
} from '@agoric/internal/src/upgrade-api.js';
import { makeHeapZone } from '@agoric/base-zone/heap.js';

import { prepareBasicVowTools } from './src/tools.js';
import makeE from './src/E.js';

/** @type {import('./src/types.js').IsRetryableReason} */
const isRetryableReason = (reason, priorRetryValue) => {
  if (
    isUpgradeDisconnection(reason) &&
    (!isUpgradeDisconnection(priorRetryValue) ||
      reason.incarnationNumber > priorRetryValue.incarnationNumber)
  ) {
    return reason;
  }
  // For abandoned errors there is no way to differentiate errors from
  // consecutive upgrades
  if (isAbandonedError(reason) && !isAbandonedError(priorRetryValue)) {
    return reason;
  }
  return undefined;
};

export const defaultPowers = harden({
  isRetryableReason,
});

/**
 * Produce SwingSet-compatible vowTools, with an arbitrary Zone type
 *
 * @type {typeof prepareBasicVowTools}
 */
export const prepareSwingsetVowTools = (zone, powers = {}) =>
  prepareBasicVowTools(zone, { ...defaultPowers, ...powers });
harden(prepareSwingsetVowTools);

/**
 * Reexport as prepareVowTools, since that's the thing that people find easiest
 * to reach.
 */
export { prepareSwingsetVowTools as prepareVowTools };

/**
 * `vowTools` that are not durable, but are useful in non-durable clients that
 * need to consume vows from other SwingSet vats.
 */
export const heapVowTools = prepareSwingsetVowTools(makeHeapZone());

/**
 * A vow-shortening E, for use in vats that are not durable but receive vows.
 *
 * When the vows must be watched durably, use vowTools prepared in a durable zone.
 *
 * This produces long-lived ephemeral promises that encapsulate the shortening
 * behaviour, and so provides no way for `watch` to durably shorten. Use the
 * standard `import('@endo/far').E` if you need to `watch` its resulting
 * promises.
 */
export const heapVowE = makeE(globalThis.HandledPromise, {
  unwrap: heapVowTools.when,
  additional: { when: heapVowTools.when },
});
