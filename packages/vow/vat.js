/**
 * @file specialization of the `@agoric/vow` package for the vat disconnection rejections produced by
 * the SwingSet kernel.
 */

// @ts-check
import { isUpgradeDisconnection } from '@agoric/internal/src/upgrade-api.js';
import { makeHeapZone } from '@agoric/base-zone/heap.js';
import { prepareVowTools as rawPrepareVowTools } from './src/index.js';

export { EVow$, OrVow$ } from './src/index.js';

/** @type {import('./src/types.js').IsRetryableReason} */
const isRetryableReason = (reason, priorRetryValue) => {
  if (
    isUpgradeDisconnection(reason) &&
    (!priorRetryValue ||
      reason.incarnationNumber > priorRetryValue.incarnationNumber)
  ) {
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
 * @type {typeof rawPrepareVowTools}
 */
export const prepareVowTools = (zone, powers = {}) =>
  rawPrepareVowTools(zone, { ...defaultPowers, ...powers });

/**
 * `vowTools` that are not durable, but are useful in non-durable clients that
 * need to consume vows from other SwingSet vats.
 */
export const heapVowTools = prepareVowTools(makeHeapZone());

export const { E: heapVowE } = heapVowTools;
