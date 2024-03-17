// eslint-disable-next-line import/order
import {
  test,
  getBaggage,
  annihilate,
  nextLife,
} from './prepare-test-env-ava.js';

import { Fail } from '@endo/errors';
import { prepareVowTools } from '@agoric/vow';
import { prepareVowTools as prepareWatchableVowTools } from '@agoric/vat-data/vow.js';
import { makeHeapZone } from '@agoric/zone/heap.js';
import { makeVirtualZone } from '@agoric/zone/virtual.js';
import { makeDurableZone } from '@agoric/zone/durable.js';

import { prepareLogStore } from '../src/log-store.js';
import { vowishKey } from '../src/weak-bijection.js';

/**
 * @param {any} t
 * @param {Zone} zone
 * @param {VowTools} vowTools
 */
const testLogStorePlay = async (t, zone, { makeVowKit }) => {
  const makeLogStore = prepareLogStore(zone);

  const log = zone.makeOnce('log', () => makeLogStore());
  const v1 = zone.makeOnce('v1', () => makeVowKit().vow);

  t.is(log.getIndex(), 0);
  t.is(log.getLength(), 0);
  t.throws(() => log.pushEntry(['bogus']), {
    message:
      /^In "pushEntry" method of \(LogStore\): arg 0: \["bogus"\] - Must match one of/,
  });
  t.false(log.isReplaying());
  t.is(await log.promiseReplayDone(), undefined);

  t.is(log.pushEntry(harden(['doFulfill', v1, 'x'])), 1);
  t.is(log.pushEntry(harden(['doReject', v1, 'x'])), 2);
  t.deepEqual(log.dump(), [
    ['doFulfill', v1, 'x'],
    ['doReject', v1, 'x'],
  ]);
  // Because t.deepEqual is too tolerant
  t.is(vowishKey(log.dump()[0][1]), vowishKey(v1));
  t.is(vowishKey(log.dump()[1][1]), vowishKey(v1));

  t.is(log.getIndex(), 2);
  t.is(log.getLength(), 2);
  t.false(log.isReplaying());
  t.is(await log.promiseReplayDone(), undefined);
};

/**
 * @param {any} t
 * @param {Zone} zone
 * @param {VowTools} _vowTools
 */
const testLogStoreReplay = async (t, zone, _vowTools) => {
  prepareLogStore(zone);

  const log = /** @type {LogStore} */ (
    zone.makeOnce('log', () => Fail`log expected`)
  );
  const v1 = /** @type {Vow} */ (zone.makeOnce('v1', () => Fail`v1 expected`));

  t.is(log.getIndex(), 0);
  t.is(log.getLength(), 2);
  t.true(log.isReplaying());

  t.deepEqual(log.dump(), [
    ['doFulfill', v1, 'x'],
    ['doReject', v1, 'x'],
  ]);
  // Because t.deepEqual is too tolerant
  t.is(vowishKey(log.dump()[0][1]), vowishKey(v1));
  t.is(vowishKey(log.dump()[1][1]), vowishKey(v1));

  t.deepEqual(log.nextEntry(), ['doFulfill', v1, 'x']);
  t.deepEqual(log.nextEntry(), ['doReject', v1, 'x']);
  t.is(log.getIndex(), 2);
  t.false(log.isReplaying());
  t.is(await log.promiseReplayDone(), undefined);
};

await test('test heap log-store', async t => {
  const zone = makeHeapZone('heapRoot');
  const vowTools = prepareVowTools(zone);
  return testLogStorePlay(t, zone, vowTools);
});

await test.serial('test virtual log-store', async t => {
  annihilate();
  const zone = makeVirtualZone('virtualRoot');
  const vowTools = prepareVowTools(zone);
  return testLogStorePlay(t, zone, vowTools);
});

await test.serial('test durable log-store', async t => {
  annihilate();

  nextLife();
  const zone1 = makeDurableZone(getBaggage(), 'durableRoot');
  const vowTools1 = prepareWatchableVowTools(zone1);
  await testLogStorePlay(t, zone1, vowTools1);

  nextLife();
  const zone2 = makeDurableZone(getBaggage(), 'durableRoot');
  const vowTools2 = prepareWatchableVowTools(zone2);
  return testLogStoreReplay(t, zone2, vowTools2);
});
