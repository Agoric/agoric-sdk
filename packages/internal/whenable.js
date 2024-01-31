/* global globalThis */
import { prepareWhenableModule as rawPrepareWhenableModule } from '@agoric/whenable';
import { makeHeapZone } from '@agoric/base-zone/heap.js';
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

export const defaultPowers = harden({
  rejectionMeansRetry,
  watchPromise,
});

export const prepareWhenableModule = (zone, powers = {}) =>
  rawPrepareWhenableModule(zone, { ...defaultPowers, ...powers });

export const { E, watch, when, makeWhenableKit } = prepareWhenableModule(
  makeHeapZone(),
);
