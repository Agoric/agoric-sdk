/* global globalThis */
// @ts-check
import { isUpgradeDisconnection } from '@agoric/internal/src/upgrade-api.js';
import { makeHeapZone } from '@agoric/base-zone/heap.js';
import { makeE, prepareVowTools as rawPrepareVowTools } from './src/index.js';

/**
 * Return truthy if a rejection reason should result in a retry.
 * @param {any} reason
 * @returns {boolean}
 */
const isRetryableReason = reason => isUpgradeDisconnection(reason);

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
