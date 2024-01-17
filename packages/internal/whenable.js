/* global globalThis */

import { makeHeapZone } from '@agoric/base-zone/heap';
import { prepareWhenableModule as wrappedPrepareWhenableModule } from '@agoric/whenable';
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

/** @type {typeof wrappedPrepareWhenableModule} */
export const prepareWhenableModule = (zone, powers) =>
  wrappedPrepareWhenableModule(zone, {
    rejectionMeansRetry,
    watchPromise,
    ...powers,
  });
harden(prepareWhenableModule);

// Heap-based whenable support for migration to durable objects.
const { watch, when, makeWhenableKit, makeWhenablePromiseKit } =
  prepareWhenableModule(makeHeapZone());
export { watch, when, makeWhenableKit, makeWhenablePromiseKit };
