/* global globalThis */
// @ts-check
import {
  makeE,
  prepareWhenableTools as rawPrepareWhenableTools,
} from '@agoric/whenable';
import { makeHeapZone } from '@agoric/base-zone/heap.js';
import { isUpgradeDisconnection } from '@agoric/internal/src/upgrade-api.js';

/** @type {any} */
const vatData = globalThis.VatData;

/**
 * Manually-extracted watchPromise so we don't accidentally get the 'unavailable'
 * version.  If it is `undefined`, `@agoric/whenable` will shim it.
 * @type {undefined | ((
 *   p: Promise<any>,
 *   watcher: import('@agoric/whenable/src/watch.js').PromiseWatcher,
 *   ...args: unknown[]
 * ) => void)}
 */
const watchPromise = vatData && vatData.watchPromise;

/**
 * Return truthy if a rejection reason should result in a retry.
 * @param {any} reason
 * @returns {boolean}
 */
const rejectionMeansRetry = reason => isUpgradeDisconnection(reason);

export const defaultPowers = harden({
  rejectionMeansRetry,
  watchPromise,
});

/**
 * @type {typeof rawPrepareWhenableTools}
 */
export const prepareWhenableTools = (zone, powers = {}) =>
  rawPrepareWhenableTools(zone, { ...defaultPowers, ...powers });

export const { watch, when, makeWhenableKit } = prepareWhenableTools(
  makeHeapZone(),
);

/**
 * An whenable-shortening E.  CAVEAT: This produces long-lived ephemeral
 * promises that encapsulate the shortening behaviour, and so provides no way
 * for `watch` to durably shorten.  Use the standard `import('@endo/far').E` if
 * you need to `watch` its resulting promises.
 */
export const V = makeE(globalThis.HandledPromise, { unwrap: when });
