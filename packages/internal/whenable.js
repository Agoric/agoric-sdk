/* global globalThis */
// @ts-check
import { prepareWhenableTools as rawPrepareWhenableTools } from '@agoric/whenable';
import { makeHeapZone } from '@agoric/base-zone/heap.js';
import { isUpgradeDisconnection } from './src/upgrade-api.js';

const vatData = /** @type {any} */ (globalThis).VatData;

/**
 * @type {undefined | ((
 *   p: PromiseLike<any>,
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

export const { E, watch, when, makeWhenableKit } = prepareWhenableTools(
  makeHeapZone(),
);
