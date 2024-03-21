// eslint-disable-next-line import/order
import {
  test,
  getBaggage,
  annihilate,
  nextLife,
} from './prepare-test-env-ava.js';

import { Fail } from '@endo/errors';
import { passStyleOf } from '@endo/pass-style';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { PromiseWatcherI } from '@agoric/vow/src/watch-promise.js';
import { makePromiseKit } from '@endo/promise-kit';
// import { prepareVowTools } from '@agoric/vow';
import { prepareVowTools as prepareWatchableVowTools } from '@agoric/vat-data/vow.js';

// import { makeHeapZone } from '../heap.js';
// import { makeVirtualZone } from '../virtual.js';
import { makeDurableZone } from '../durable.js';

/**
 * @param {any} t
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {any} vowTools
 */
const testFirstPlay = async (t, zone, vowTools) => {
  const { watch, makeVowKit } = vowTools;

  const rupertGiles = zone.exo('RupertGiles', PromiseWatcherI, {
    onFulfilled(fulfillment) {
      console.log('should not wake yet', fulfillment);
    },
    onRejected(reason) {
      console.log('should not startle yet', reason);
    },
  });
  const { vow: v1 } = zone.makeOnce('v1', () => makeVowKit());
  t.is(passStyleOf(v1), 'tagged');

  watch(v1, rupertGiles);
};

/**
 * @param {any} t
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {any} _vowTools
 */
const testReplay = async (t, zone, _vowTools) => {
  const { promise, resolve, reject } = makePromiseKit();

  zone.exo('RupertGiles', PromiseWatcherI, {
    onFulfilled(fulfillment) {
      console.log('woken', fulfillment);
      resolve(fulfillment);
    },
    onRejected(reason) {
      console.log('startled', reason);
      reject(reason);
    },
  });

  const { vow: v1, resolver: r1 } =
    /** @type {import('@agoric/vow').VowKit} */ (
      zone.makeOnce('v1', () => Fail`v1 expected`)
    );
  t.is(passStyleOf(v1), 'tagged');
  console.log('ask to awaken');
  r1.resolve('wake up');
  const f = await promise;
  // BUG? We never get here
  console.log('fulfilled', f);
};

// await test.serial('test heap async-flow', async t => {
//   const zone = makeHeapZone('heapRoot');
//   const vowTools = prepareVowTools(zone);
//   return testFirstPlay(t, zone, vowTools);
// });

// await test.serial('test virtual async-flow', async t => {
//   annihilate();
//   const zone = makeVirtualZone('virtualRoot');
//   const vowTools = prepareVowTools(zone);
//   return testFirstPlay(t, zone, vowTools);
// });

await test.serial('test durable async-flow', async t => {
  annihilate();

  nextLife();
  const zone1 = makeDurableZone(getBaggage(), 'durableRoot');
  const vowTools1 = prepareWatchableVowTools(zone1);
  await testFirstPlay(t, zone1, vowTools1);

  await eventLoopIteration();

  nextLife();
  const zone2 = makeDurableZone(getBaggage(), 'durableRoot');
  const vowTools2 = prepareWatchableVowTools(zone2);
  return testReplay(t, zone2, vowTools2);
});
