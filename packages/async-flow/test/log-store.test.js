// eslint-disable-next-line import/order
import {
  test,
  getBaggage,
  annihilate,
  nextLife,
} from './prepare-test-env-ava.js';

import { Fail } from '@endo/errors';
import { prepareVowTools, toPassableCap } from '@agoric/vow';
import { makeHeapZone } from '@agoric/zone/heap.js';
import { makeVirtualZone } from '@agoric/zone/virtual.js';
import { makeDurableZone } from '@agoric/zone/durable.js';

import { prepareLogStore } from '../src/log-store.js';

/**
 * @import {Zone} from '@agoric/base-zone'
 * @import {Vow} from '@agoric/vow'
 * @import {LogStore} from '../src/log-store.js';
 */

/**
 * @param {any} t
 * @param {Zone} zone
 */
const testLogStorePlay = async (t, zone) => {
  const { makeVowKit } = prepareVowTools(zone);
  const makeLogStore = prepareLogStore(zone);

  const log = zone.makeOnce('log', () => makeLogStore());
  const v1 = zone.makeOnce('v1', () => makeVowKit().vow);
  const v2 = zone.makeOnce('v2', () => makeVowKit().vow);

  t.is(log.getIndex(), 0);
  t.is(log.getLength(), 0);
  t.throws(
    () =>
      // @ts-expect-error testing invalid input
      log.pushEntry(['bogus']),
    {
      message:
        /^In "pushEntry" method of \(LogStore\): arg 0: \["bogus"\] - Must match one of/,
    },
  );
  t.false(log.isReplaying());
  t.is(await log.promiseReplayDone(), undefined);

  const gen0Entries = [['startGeneration', 0]];
  const gen0 = i => gen0Entries.length + i;

  t.is(log.pushEntry(harden(['doFulfill', v1, 'x'])), gen0(1));
  t.is(log.pushEntry(harden(['doReject', v2, 'y'])), gen0(2));
  t.deepEqual(log.dump(), [
    ['doFulfill', v1, 'x'],
    ['doReject', v2, 'y'],
  ]);
  // Because t.deepEqual is too tolerant
  // @ts-expect-error data dependent typing
  t.is(toPassableCap(log.dump()[0][1]), toPassableCap(v1));
  // @ts-expect-error data dependent typing
  t.is(toPassableCap(log.dump()[1][1]), toPassableCap(v2));

  t.is(log.getIndex(), 2);
  t.is(log.getUnfilteredIndex(), gen0(2));
  t.is(log.getLength(), gen0(2));
  t.false(log.isReplaying());
  t.is(await log.promiseReplayDone(), undefined);
};

/**
 * @param {any} t
 * @param {Zone} zone
 */
const testLogStoreReplay = async (t, zone) => {
  prepareVowTools(zone);
  prepareLogStore(zone);

  const log = /** @type {LogStore} */ (
    zone.makeOnce('log', () => Fail`need log`)
  );
  const v1 = /** @type {Vow} */ (zone.makeOnce('v1', () => Fail`need v1`));
  const v2 = /** @type {Vow} */ (zone.makeOnce('v2', () => Fail`need v2`));

  const gen0Entries = [['startGeneration', 0]];
  const gen0 = i => gen0Entries.length + i;
  const gen1Entries = [['startGeneration', 1]];
  const gen1 = i => gen1Entries.length + i;

  t.is(log.getIndex(), 0);
  t.is(log.getUnfilteredIndex(), 0);
  t.is(log.getLength(), gen0(2));
  t.true(log.isReplaying());

  t.deepEqual(log.dump(), [
    ['doFulfill', v1, 'x'],
    ['doReject', v2, 'y'],
  ]);

  t.deepEqual(log.dumpUnfiltered(), [
    ...gen0Entries,
    ['doFulfill', v1, 'x'],
    ['doReject', v2, 'y'],
  ]);
  // Because t.deepEqual is too tolerant
  // @ts-expect-error data dependent typing
  t.is(toPassableCap(log.dump()[0][1]), toPassableCap(v1));
  // @ts-expect-error data dependent typing
  t.is(toPassableCap(log.dump()[1][1]), toPassableCap(v2));

  t.deepEqual(log.nextEntry(), ['doFulfill', v1, 'x']);
  t.deepEqual(log.nextEntry(), ['doReject', v2, 'y']);
  t.is(log.getIndex(), 2);
  t.is(log.getUnfilteredIndex(), gen0(2));
  t.false(log.isReplaying());
  t.is(await log.promiseReplayDone(), undefined);

  t.is(log.pushEntry(harden(['doFulfill', v1, 'x2'])), gen1(gen0(3)));
  t.deepEqual(log.dumpUnfiltered(), [
    ...gen0Entries,
    ['doFulfill', v1, 'x'],
    ['doReject', v2, 'y'],
    ...gen1Entries,
    ['doFulfill', v1, 'x2'],
  ]);

  // Check that a disposed log starts from scratch, but the same generation.
  log.dispose();
  t.deepEqual(log.dumpUnfiltered(), []);
  t.is(log.pushEntry(harden(['doFulfill', v1, 'x3'])), gen1(1));
  t.deepEqual(log.dumpUnfiltered(), [...gen1Entries, ['doFulfill', v1, 'x3']]);
};

await test.serial('test heap log-store', async t => {
  const zone = makeHeapZone('heapRoot');
  return testLogStorePlay(t, zone);
});

test.serial('test virtual log-store', async t => {
  annihilate();
  const zone = makeVirtualZone('virtualRoot');
  return testLogStorePlay(t, zone);
});

test.serial('test durable log-store', async t => {
  annihilate();

  nextLife();
  const zone1 = makeDurableZone(getBaggage(), 'durableRoot');
  await testLogStorePlay(t, zone1);

  nextLife();
  const zone2 = makeDurableZone(getBaggage(), 'durableRoot');
  return testLogStoreReplay(t, zone2);
});
