// eslint-disable-next-line import/order
import {
  test,
  getBaggage,
  annihilate,
  nextLife,
} from './prepare-test-env-ava.js';

import { Fail } from '@endo/errors';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { prepareVowTools } from '@agoric/vow';
import { makeHeapZone } from '@agoric/zone/heap.js';
import { makeVirtualZone } from '@agoric/zone/virtual.js';
import { makeDurableZone } from '@agoric/zone/durable.js';

import { prepareLogStore } from '../src/log-store.js';
import { prepareBijection } from '../src/bijection.js';
import { makeReplayMembrane } from '../src/replay-membrane.js';

/**
 * @import {PromiseKit} from '@endo/promise-kit'
 * @import {Zone} from '@agoric/base-zone'
 */

const watchWake = _vowish => {};
const panic = problem => Fail`panic over ${problem}`;

/**
 * @param {any} t
 * @param {Zone} zone
 */
const testMissingStop = async (t, zone) => {
  const vowTools = prepareVowTools(zone);
  const { makeVowKit } = vowTools;
  const makeLogStore = prepareLogStore(zone);
  const makeBijection = prepareBijection(zone);

  const log = makeLogStore();
  const bijection = makeBijection();

  const memA = makeReplayMembrane({
    log,
    bijection,
    vowTools,
    watchWake,
    panic,
  });

  const { vow: v1, resolver: r1 } = makeVowKit();

  const p1A = memA.hostToGuest(v1);
  t.true(bijection.has(p1A, v1));

  await eventLoopIteration();

  t.deepEqual(log.dump(), []);

  // do all the steps to drop an old membrane and set up a new membrane,
  // except stopping the old membrane,
  // to demonstate why `makeGuestForHostVow` also tests`stopped`.
  log.reset();
  bijection.reset();
  const memB = makeReplayMembrane({
    log,
    bijection,
    vowTools,
    watchWake,
    panic,
  });

  const p1B = memB.hostToGuest(v1);
  t.true(bijection.has(p1B, v1));
  t.false(bijection.hasGuest(p1A));

  await eventLoopIteration();

  t.deepEqual(log.dump(), []);

  r1.resolve('x');

  await eventLoopIteration();

  t.deepEqual(log.dump(), [
    // keep line break
    ['doFulfill', v1, 'x'],
    ['doFulfill', v1, 'x'], // this duplication is wrong, is the point
  ]);
};

/**
 * @param {any} t
 * @param {Zone} zone
 */
const testProperStop = async (t, zone) => {
  const vowTools = prepareVowTools(zone);
  const { makeVowKit } = vowTools;
  const makeLogStore = prepareLogStore(zone);
  const makeBijection = prepareBijection(zone);

  const log = makeLogStore();
  const bijection = makeBijection();

  const memA = makeReplayMembrane({
    log,
    bijection,
    vowTools,
    watchWake,
    panic,
  });

  const { vow: v1, resolver: r1 } = makeVowKit();

  const p1A = memA.hostToGuest(v1);
  t.true(bijection.has(p1A, v1));

  await eventLoopIteration();

  t.deepEqual(log.dump(), []);

  // do all the steps to drop an old membrane and set up a new membrane,
  // including stopping the old membrane,
  // to demonstate why `makeGuestForHostVow` also tests`stopped`.
  log.reset();
  bijection.reset();
  memA.stop(); // the point
  const memB = makeReplayMembrane({
    log,
    bijection,
    vowTools,
    watchWake,
    panic,
  });

  const p1B = memB.hostToGuest(v1);
  t.true(bijection.has(p1B, v1));
  t.false(bijection.hasGuest(p1A));

  await eventLoopIteration();

  t.deepEqual(log.dump(), []);

  r1.resolve('x');

  await eventLoopIteration();

  t.deepEqual(log.dump(), [
    // keep line break
    ['doFulfill', v1, 'x'],
  ]);
};

test.serial('test heap replay-membrane missing stop', async t => {
  const zone = makeHeapZone('heapRoot');
  return testMissingStop(t, zone);
});

test.serial('test heap replay-membrane proper stop', async t => {
  annihilate();
  const zone = makeHeapZone('heapRoot');
  return testProperStop(t, zone);
});

test.serial('test virtual replay-membrane missing stop', async t => {
  annihilate();
  const zone = makeVirtualZone('virtualRoot');
  return testMissingStop(t, zone);
});

test.serial('test virtual replay-membrane proper stop', async t => {
  annihilate();
  const zone = makeVirtualZone('virtualRoot');
  return testProperStop(t, zone);
});

test.serial('test durable replay-membrane missing stop', async t => {
  annihilate();
  nextLife();
  const zone = makeDurableZone(getBaggage(), 'durableRoot');
  return testMissingStop(t, zone);
});

test.serial('test durable replay-membrane proper stop', async t => {
  annihilate();
  nextLife();
  const zone = makeDurableZone(getBaggage(), 'durableRoot');
  return testProperStop(t, zone);
});
