/* global globalThis */
// @ts-check
import { makeE, prepareVowTools as rawPrepareVowTools } from '@agoric/vow';
import { makeHeapZone } from '@agoric/base-zone/heap.js';
import { isUpgradeDisconnection } from '@agoric/internal/src/upgrade-api.js';

/** @type {any} */
const vatData = globalThis.VatData;

/**
 * Manually-extracted watchPromise so we don't accidentally get the 'unavailable'
 * version.  If it is `undefined`, `@agoric/vow` will shim it.
 * @type {undefined | ((
 *   p: Promise<any>,
 *   watcher: import('@agoric/vow/src/watch-promise.js').PromiseWatcher,
 *   ...args: unknown[]
 * ) => void)}
 */
const watchPromise = vatData && vatData.watchPromise;

/**
 * Return truthy if a rejection reason should result in a retry.
 * @param {any} reason
 * @returns {boolean}
 */
const isRetryableReason = reason => isUpgradeDisconnection(reason);

export const defaultPowers = harden({
  isRetryableReason,
  watchPromise,
});

/**
 * @type {typeof rawPrepareVowTools}
 */
export const prepareVowTools = (zone, powers = {}) =>
  rawPrepareVowTools(zone, { ...defaultPowers, ...powers });

export const { watch, when, makeVowKit, allVows } = prepareVowTools(
  makeHeapZone(),
);

/**
 * An vow-shortening E.  CAVEAT: This produces long-lived ephemeral
 * promises that encapsulate the shortening behaviour, and so provides no way
 * for `watch` to durably shorten.  Use the standard `import('@endo/far').E` if
 * you need to `watch` its resulting promises.
 */
export const V = makeE(globalThis.HandledPromise, {
  unwrap: when,
  additional: { when },
});
