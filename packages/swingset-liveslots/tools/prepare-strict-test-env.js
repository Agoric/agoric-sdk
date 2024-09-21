/**
 * Prepare Agoric SwingSet vat global strict environment for testing.
 *
 * Installs Hardened JS (and does lockdown), plus adds mocks for virtual objects
 * and stores.
 *
 * Exports tools for simulating upgrades.
 */

import '@agoric/internal/src/install-ses-debug.js';

// eslint-disable-next-line import/order
import { reincarnate } from './setup-vat-data.js';

import { makePromiseKit } from '@endo/promise-kit';
import { Fail } from '@endo/errors';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeUpgradeDisconnection } from '@agoric/internal/src/upgrade-api.js';

export { eventLoopIteration as nextCrank };

/** @type {ReturnType<typeof reincarnate>} */
let incarnation;
let incarnationNumber = 0;

export const annihilate = () => {
  incarnation = reincarnate({ relaxDurabilityRules: false });
  incarnationNumber = 0;
};

export const getBaggage = () => {
  return incarnation.fakeVomKit.cm.provideBaggage();
};

export const nextLife = () => {
  incarnation = reincarnate(incarnation);
  incarnationNumber += 1;
};

/**
 * @template {(baggage: import('@agoric/swingset-liveslots').Baggage) => Promise<any> | any} B
 * @param {B} build
 * @param {(tools: Awaited<ReturnType<B>>) => Promise<void> | void} [run]
 */
export const startLife = async (build, run) => {
  await eventLoopIteration();
  const oldIncarnationNumber = incarnationNumber;
  const oldIncarnation = incarnation;
  const disconnectionObject = makeUpgradeDisconnection(
    'vat upgraded',
    oldIncarnationNumber,
  );
  nextLife();
  const { fakeVomKit } = incarnation;
  /** @type {Map<string, import('@endo/promise-kit').PromiseKit<any>>} */
  const previouslyWatchedPromises = new Map();
  let buildTools;
  try {
    buildTools = await build(getBaggage());
    fakeVomKit.wpm.loadWatchedPromiseTable(vref => {
      // See revivePromise in liveslots.js
      const { getValForSlot, valToSlot, setValForSlot } = fakeVomKit.fakeStuff;
      // Assume all promises were decided by the previous incarnation
      !getValForSlot(vref) || Fail`Attempting to revive known promise ${vref}`;
      const pk = makePromiseKit();
      previouslyWatchedPromises.set(vref, pk);
      const val = pk.promise;
      valToSlot.set(val, vref);
      setValForSlot(vref, val);
      return val;
    });

    fakeVomKit.vom.insistAllDurableKindsReconnected();

    await eventLoopIteration();
    // End of start crank
  } catch (err) {
    // Rollback upgrade
    incarnation = oldIncarnation;
    incarnationNumber = oldIncarnationNumber;
    throw err;
  }

  // Simulate a dispatch of previously decided promise rejections
  // In real swingset this could happen after some deliveries
  for (const { reject } of previouslyWatchedPromises.values()) {
    reject(disconnectionObject);
  }
  await eventLoopIteration();
  // End of resolution dispatch crank

  if (run) {
    await run(buildTools);
    await eventLoopIteration();
  }
};

// Setup the initial incarnation
annihilate();
