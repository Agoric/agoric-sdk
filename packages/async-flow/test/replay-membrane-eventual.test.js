// eslint-disable-next-line import/order
import {
  test,
  getBaggage,
  annihilate,
  nextLife,
} from './prepare-test-env-ava.js';

import { Fail } from '@endo/errors';
import { prepareVowTools } from '@agoric/vow';
import { E } from '@endo/eventual-send';
// import E from '@agoric/vow/src/E.js';
import { makeHeapZone } from '@agoric/zone/heap.js';
import { makeVirtualZone } from '@agoric/zone/virtual.js';
import { makeDurableZone } from '@agoric/zone/durable.js';

import { prepareLogStore } from '../src/log-store.js';
import { prepareBijection } from '../src/bijection.js';
import { makeReplayMembrane } from '../src/replay-membrane.js';

/**
 * @import {PromiseKit} from '@endo/promise-kit'
 * @import {Zone} from '@agoric/base-zone'
 * @import {LogStore} from '../src/log-store.js';
 * @import {Bijection} from '../src/bijection.js';
 */

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
  const makeLogStore = prepareLogStore(zone);
  const makeBijection = prepareBijection(zone);
  const makePingee = preparePingee(zone);

  const log = zone.makeOnce('log', () => makeLogStore());
  const bij = zone.makeOnce('bij', makeBijection);

  const mem = makeReplayMembrane(log, bij, vowTools, watchWake, panic);

  t.deepEqual(log.dump(), []);

  /** @type {Pingee} */
  const pingee = zone.makeOnce('pingee', () => makePingee());
  /** @type {Pingee} */
  const guestPingee = mem.hostToGuest(pingee);
  t.deepEqual(log.dump(), []);

  const pingTestSendResult = t.throwsAsync(() => E(guestPingee).ping('send'), {
    message:
      'panic over "[Error: guest eventual send not yet supported: \\"[Alleged: Pingee guest wrapper]\\".ping([\\"send\\"]) -> \\"[Promise]\\"]"',
  });

  guestPingee.ping('call');

  await pingTestSendResult;

  t.deepEqual(log.dump(), [
    ['checkCall', pingee, 'ping', ['call'], 0],
    ['doReturn', 0, undefined],
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
  return testFirstPlay(t, zone1);
});
