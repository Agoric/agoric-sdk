/* global globalThis */
// @ts-check
import { isUpgradeDisconnection } from '@agoric/internal/src/upgrade-api.js';
import { makeHeapZone } from '@agoric/base-zone/heap.js';
import { makeE, prepareVowTools as rawPrepareVowTools } from './src/index.js';

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
 * @type {typeof rawPrepareVowTools}
 */
export const prepareVowTools = (zone, powers = {}) =>
  rawPrepareVowTools(zone, { ...defaultPowers, ...powers });

export const vowTools = prepareVowTools(makeHeapZone());
export const { watch, when, makeVowKit, allVows } = vowTools;

/**
 * A vow-shortening E.  CAVEAT: This produces long-lived ephemeral
 * promises that encapsulate the shortening behaviour, and so provides no way
 * for `watch` to durably shorten.  Use the standard `import('@endo/far').E` if
 * you need to `watch` its resulting promises.
 */
export const V = makeE(globalThis.HandledPromise, {
  unwrap: when,
  additional: { when },
});
