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
 * @import {PromiseKit} from '@endo/promise-kit'
 * @import {Zone} from '@agoric/base-zone'
 * @import {Vow, VowTools} from '@agoric/vow'
 * @import {LogStore} from '../src/log-store.js';
 * @import {Bijection} from '../src/bijection.js';
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
  t.throws(() => log.pushEntry(['bogus']), {
    message:
      /^In "pushEntry" method of \(LogStore\): arg 0: \["bogus"\] - Must match one of/,
  });
  t.false(log.isReplaying());
  t.is(await log.promiseReplayDone(), undefined);

  t.is(log.pushEntry(harden(['doFulfill', v1, 'x'])), 1);
  t.is(log.pushEntry(harden(['doReject', v2, 'y'])), 2);
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
  t.is(log.getLength(), 2);
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

  t.is(log.getIndex(), 0);
  t.is(log.getLength(), 2);
  t.true(log.isReplaying());

  t.deepEqual(log.dump(), [
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
  t.false(log.isReplaying());
  t.is(await log.promiseReplayDone(), undefined);
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
