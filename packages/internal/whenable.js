/* global globalThis */
import { isUpgradeDisconnection } from './src/upgrade-api.js';

const vatData = /** @type {any} */ (globalThis).VatData;

/** @type {(p: PromiseLike<any>, watcher: PromiseWatcher, ...args: unknown[]) => void} */
const watchPromise = vatData && vatData.watchPromise;

/**
 * Return truthy if a rejection reason should result in a retry.
 * @param {any} reason
 * @returns {boolean}
 */
const rejectionMeansRetry = reason => isUpgradeDisconnection(reason);

export const powers = harden({
  rejectionMeansRetry,
  watchPromise,
});
