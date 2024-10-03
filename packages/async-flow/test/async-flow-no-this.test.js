// eslint-disable-next-line import/order
import { test, getBaggage, annihilate } from './prepare-test-env-ava.js';

import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { prepareVowTools } from '@agoric/vow';
import { makeHeapZone } from '@agoric/zone/heap.js';
import { makeVirtualZone } from '@agoric/zone/virtual.js';
import { makeDurableZone } from '@agoric/zone/durable.js';

import { prepareTestAsyncFlowTools } from './_utils.js';

/**
 * @import {Zone} from '@agoric/base-zone';
 */

const { apply } = Reflect;

/**
 * @param {any} t
 * @param {Zone} zone
 */
const testPlay = async (t, zone) => {
  const vowTools = prepareVowTools(zone);
  const { asyncFlow } = prepareTestAsyncFlowTools(t, zone, {
    vowTools,
  });

  const { guestFunc } = {
    async guestFunc() {
      t.is(this, undefined);
    },
  };

  const wrapperFunc = asyncFlow(zone, 'guestFunc', guestFunc);

  // Demonstrates that even if something is passed as `this` to the wrapperFunc,
  // the guestFunc will run with `this` bound to `undefined`.
  apply(wrapperFunc, 'bogus', []);
};

test.serial('test heap no guest this', async t => {
  annihilate();
  const zone = makeHeapZone('heapRoot');
  await testPlay(t, zone);

  await eventLoopIteration();
});

test.serial('test virtual no guest this', async t => {
  annihilate();
  const zone = makeVirtualZone('virtualRoot');
  await testPlay(t, zone);

  await eventLoopIteration();
});

test.serial('test durable no guest this', async t => {
  annihilate();
  const zone = makeDurableZone(getBaggage(), 'durableRoot');
  await testPlay(t, zone);

  await eventLoopIteration();
});
