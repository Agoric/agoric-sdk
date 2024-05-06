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
import { E } from '@endo/eventual-send';
// import E from '@agoric/vow/src/E.js';
import { makeHeapZone } from '@agoric/zone/heap.js';
import { makeVirtualZone } from '@agoric/zone/virtual.js';
import { makeDurableZone } from '@agoric/zone/durable.js';

import { prepareLogStore } from '../src/log-store.js';
import { prepareBijection } from '../src/bijection.js';
import { makeReplayMembrane } from '../src/replay-membrane.js';

const watchWake = _vowish => {};
const panic = problem => Fail`panic over ${problem}`;

/**
 * @param {Zone} zone
 */
const preparePingee = zone =>
  zone.exoClass('Pingee', undefined, () => ({}), {
    ping(_str) {},
  });

/**
 * @typedef {ReturnType<ReturnType<preparePingee>>} Pingee
 */

/**
 * @param {any} t
 * @param {Zone} zone
 */
const testFirstPlay = async (t, zone) => {
  const vowTools = prepareVowTools(zone);
  const { makeVowKit } = vowTools;
  const makeLogStore = prepareLogStore(zone);
  const makeBijection = prepareBijection(zone);
  const makePingee = preparePingee(zone);
  const { vow: v1, resolver: r1 } = zone.makeOnce('v1', () => makeVowKit());
  const { vow: _v2, resolver: _r2 } = zone.makeOnce('v2', () => makeVowKit());

  const log = zone.makeOnce('log', () => makeLogStore());
  const bij = zone.makeOnce('bij', makeBijection);

  const mem = makeReplayMembrane(log, bij, vowTools, watchWake, panic);

  const p1 = mem.hostToGuest(v1);
  t.deepEqual(log.dump(), []);

  /** @type {Pingee} */
  const pingee = zone.makeOnce('pingee', () => makePingee());
  /** @type {Pingee} */
  const guestPingee = mem.hostToGuest(pingee);
  t.deepEqual(log.dump(), []);

  const p = E(guestPingee).ping('send');

  guestPingee.ping('call');

  t.is(await p, undefined);
  const dump = log.dump();
  const v3 = dump[3][2];
  t.deepEqual(dump, [
    ['checkCall', pingee, 'ping', ['call'], 0],
    ['doReturn', 0, undefined],
    ['checkSend', pingee, 'ping', ['send'], 2],
    ['doReturn', 2, v3],
    ['doFulfill', v3, undefined],
  ]);

  r1.resolve('x');
  t.is(await p1, 'x');

  t.deepEqual(log.dump(), [
    ['checkCall', pingee, 'ping', ['call'], 0],
    ['doReturn', 0, undefined],
    ['checkSend', pingee, 'ping', ['send'], 2],
    ['doReturn', 2, v3],
    ['doFulfill', v3, undefined],
    ['doFulfill', v1, 'x'],
  ]);
};

/**
 * @param {any} t
 * @param {Zone} zone
 */
const testReplay = async (t, zone) => {
  const vowTools = prepareVowTools(zone);
  prepareLogStore(zone);
  prepareBijection(zone);
  preparePingee(zone);
  const { vow: v1 } = zone.makeOnce('v1', () => Fail`need v1`);
  const { vow: v2, resolver: r2 } = zone.makeOnce('v2', () => Fail`need v2`);

  const log = /** @type {LogStore} */ (
    zone.makeOnce('log', () => Fail`need log`)
  );
  const bij = /** @type {Bijection} */ (
    zone.makeOnce('bij', () => Fail`need bij`)
  );

  const pingee = zone.makeOnce('pingee', () => Fail`need pingee`);

  const dump = log.dump();
  const v3 = dump[3][2];
  t.deepEqual(dump, [
    ['checkCall', pingee, 'ping', ['call'], 0],
    ['doReturn', 0, undefined],
    ['checkSend', pingee, 'ping', ['send'], 2],
    ['doReturn', 2, v3],
    ['doFulfill', v3, undefined],
    ['doFulfill', v1, 'x'],
  ]);

  const mem = makeReplayMembrane(log, bij, vowTools, watchWake, panic);
  t.true(log.isReplaying());
  t.is(log.getIndex(), 0);

  const guestPingee = mem.hostToGuest(pingee);
  const p2 = mem.hostToGuest(v2);
  // @ts-expect-error TS doesn't know that r2 is a resolver
  r2.resolve('y');
  await eventLoopIteration();

  const p1 = mem.hostToGuest(v1);
  mem.wake();
  t.true(log.isReplaying());
  t.is(log.getIndex(), 0);
  t.deepEqual(log.dump(), [
    ['checkCall', pingee, 'ping', ['call'], 0],
    ['doReturn', 0, undefined],
    ['checkSend', pingee, 'ping', ['send'], 2],
    ['doReturn', 2, v3],
    ['doFulfill', v3, undefined],
    ['doFulfill', v1, 'x'],
  ]);

  E(guestPingee).ping('send');

  guestPingee.ping('call');

  t.is(await p1, 'x');
  t.is(await p2, 'y');
  t.false(log.isReplaying());

  t.deepEqual(log.dump(), [
    ['checkCall', pingee, 'ping', ['call'], 0],
    ['doReturn', 0, undefined],
    ['checkSend', pingee, 'ping', ['send'], 2],
    ['doReturn', 2, v3],
    ['doFulfill', v3, undefined],
    ['doFulfill', v1, 'x'],
    ['doFulfill', v2, 'y'],
  ]);
};

test.serial('test heap replay-membrane settlement', async t => {
  const zone = makeHeapZone('heapRoot');
  return testFirstPlay(t, zone);
});

test.serial('test virtual replay-membrane settlement', async t => {
  annihilate();
  const zone = makeVirtualZone('virtualRoot');
  return testFirstPlay(t, zone);
});

test.serial('test durable replay-membrane settlement', async t => {
  annihilate();

  nextLife();
  const zone1 = makeDurableZone(getBaggage(), 'durableRoot');
  await testFirstPlay(t, zone1);

  nextLife();
  const zone3 = makeDurableZone(getBaggage(), 'durableRoot');
  return testReplay(t, zone3);
});
