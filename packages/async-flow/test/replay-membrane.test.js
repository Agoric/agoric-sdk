// eslint-disable-next-line import/order
import {
  test,
  getBaggage,
  annihilate,
  nextLife,
  asyncFlowVerbose,
} from './prepare-test-env-ava.js';

import { Fail } from '@endo/errors';
import { isPromise } from '@endo/promise-kit';
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
 * @import {MapStore} from '@agoric/store';
 * @import {LogStore} from '../src/log-store.js';
 * @import {Bijection} from '../src/bijection.js';
 */

const watchWake = _vowish => {};
const panic = problem => Fail`panic over ${problem}`;

/**
 * @param {Zone} zone
 * @param {number} [k]
 */
const prepareOrchestra = (zone, k = 1) =>
  zone.exoClass(
    'Orchestra',
    undefined,
    (factor, vow, resolver) => ({ factor, vow, resolver }),
    {
      scale(n) {
        const { state } = this;
        return k * state.factor * n;
      },
      vow() {
        const { state } = this;
        return state.vow;
      },
      resolve(x) {
        const { state } = this;
        state.resolver.resolve(x);
      },
    },
  );

/**
 * @param {any} t
 * @param {Zone} zone
 * @param {boolean} [showOnConsole]
 */
const testFirstPlay = async (t, zone, showOnConsole = false) => {
  const vowTools = prepareVowTools(zone);
  const { makeVowKit } = vowTools;
  const makeLogStore = prepareLogStore(zone);
  const makeBijection = prepareBijection(zone);
  const makeOrchestra = prepareOrchestra(zone);
  const { vow: v1, resolver: r1 } = makeVowKit();
  const { vow: v2, resolver: r2 } = makeVowKit();

  const log = zone.makeOnce('log', () => makeLogStore());
  const bijection = zone.makeOnce('bij', makeBijection);

  const mem = makeReplayMembrane({
    log,
    bijection,
    vowTools,
    watchWake,
    panic,
  });

  const g1 = mem.hostToGuest(v1);
  t.true(isPromise(g1));
  r1.resolve('x');
  t.is(await g1, 'x');

  const hOrch7 = makeOrchestra(7, v2, r2);
  t.false(bijection.hasHost(hOrch7));
  const gOrch7 = mem.hostToGuest(hOrch7);
  t.true(bijection.has(gOrch7, hOrch7));

  const prod = gOrch7.scale(3);
  t.is(prod, 21);

  let gErr;
  try {
    gOrch7.scale(9n);
  } catch (e) {
    gErr = e;
  }

  // TODO make E work across the membrane *well*
  // TODO also try E on remote promise
  // const prodP = E(gOrch7).scale(33);
  // t.is(await prodP, 231);
  // const badP = E(gOrch7).scale(99n);
  // let gErr1;
  // try {
  //   await badP;
  // } catch (e) {
  //   gErr1 = e;
  // }
  // t.is(gErr1.name, 'TypeError');

  t.deepEqual(log.dump(), [
    ['doFulfill', v1, 'x'],
    ['checkCall', hOrch7, 'scale', [3], 1],
    ['doReturn', 1, 21],
    ['checkCall', hOrch7, 'scale', [9n], 3],
    ['doThrow', 3, mem.guestToHost(gErr)],
  ]);

  if (showOnConsole) {
    // To see the annotation chain. Once we're synced with the next ses-ava,
    // change this to a t.log, so we will see the annotation chain in context.
    t.log('gErr', gErr);
  }
};

/**
 * @param {any} t
 * @param {Zone} zone
 */
const testBadReplay = async (t, zone) => {
  const vowTools = prepareVowTools(zone);
  prepareLogStore(zone);
  prepareBijection(zone);
  prepareOrchestra(zone);

  const log = /** @type {LogStore} */ (
    zone.makeOnce('log', () => Fail`need log`)
  );
  const bijection = /** @type {Bijection} */ (
    zone.makeOnce('bij', () => Fail`need bij`)
  );

  const dump = log.dump();
  const v1 = dump[0][1];
  const hOrch7 = dump[1][1];
  const hErr = dump[4][2];

  t.false(bijection.hasHost(hOrch7));

  t.deepEqual(dump, [
    ['doFulfill', v1, 'x'],
    ['checkCall', hOrch7, 'scale', [3], 1],
    ['doReturn', 1, 21],
    ['checkCall', hOrch7, 'scale', [9n], 3],
    ['doThrow', 3, hErr],
  ]);

  const mem = makeReplayMembrane({
    log,
    bijection,
    vowTools,
    watchWake,
    panic,
  });

  const g1 = mem.hostToGuest(v1);
  mem.wake();
  t.is(await g1, 'x');
  const gOrch7 = mem.hostToGuest(hOrch7);
  t.true(bijection.has(gOrch7, hOrch7));

  // failure of guest to reproduce behavior from previous incarnations
  t.throws(() => gOrch7.scale(4), {
    message: /^panic over "\[Error: replay/,
  });
};

/**
 * @param {any} t
 * @param {Zone} zone
 */
const testGoodReplay = async (t, zone) => {
  const vowTools = prepareVowTools(zone);
  prepareLogStore(zone);
  prepareBijection(zone);
  prepareOrchestra(zone, 2); // 2 is new incarnation behavior change

  const log = /** @type {LogStore} */ (
    zone.makeOnce('log', () => Fail`need log`)
  );
  const bijection = /** @type {Bijection} */ (
    zone.makeOnce('bij', () => Fail`need bij`)
  );

  const dump = log.dump();
  const v1 = dump[0][1];
  const hOrch7 = dump[1][1];
  const hErr = dump[4][2];

  t.false(bijection.hasHost(hOrch7));

  t.deepEqual(dump, [
    ['doFulfill', v1, 'x'],
    ['checkCall', hOrch7, 'scale', [3], 1],
    ['doReturn', 1, 21],
    ['checkCall', hOrch7, 'scale', [9n], 3],
    ['doThrow', 3, hErr],
  ]);

  const oldLogLen = dump.length;

  const mem = makeReplayMembrane({
    log,
    bijection,
    vowTools,
    watchWake,
    panic,
  });

  const g1 = mem.hostToGuest(v1);
  mem.wake();
  t.is(await g1, 'x');
  const gOrch7 = mem.hostToGuest(hOrch7);
  t.true(bijection.has(gOrch7, hOrch7));

  // replay
  const prodA = gOrch7.scale(3);
  t.is(prodA, 21); // According to log of earlier incarnations
  // let gErr;
  try {
    gOrch7.scale(9n);
  } catch (e) {
    // gErr = e;
  }

  // new play
  const prodB = gOrch7.scale(3);
  t.is(prodB, 42); // According to new incarnation behavior

  const g2 = gOrch7.vow();
  const h2 = mem.guestToHost(g2);
  t.true(isPromise(g2));
  const pairA = [gOrch7, g1];
  gOrch7.resolve(pairA);
  const pairB = await g2;
  const [gOrchB, gB] = pairB;
  t.not(pairB, pairA);
  t.is(gOrchB, gOrch7);
  t.is(gB, g1);

  t.deepEqual(log.dump(), [
    ['doFulfill', v1, 'x'],
    ['checkCall', hOrch7, 'scale', [3], 1],
    ['doReturn', 1, 21],
    ['checkCall', hOrch7, 'scale', [9n], 3],
    ['doThrow', 3, hErr],

    ['checkCall', hOrch7, 'scale', [3], oldLogLen],
    ['doReturn', oldLogLen, 42],
    ['checkCall', hOrch7, 'vow', [], oldLogLen + 2],
    ['doReturn', oldLogLen + 2, h2],
    ['checkCall', hOrch7, 'resolve', [[hOrch7, v1]], oldLogLen + 4],
    ['doReturn', oldLogLen + 4, undefined],
    ['doFulfill', h2, [hOrch7, v1]],
  ]);
};

test.serial('test heap replay-membrane', async t => {
  const zone = makeHeapZone('heapRoot');
  return testFirstPlay(t, zone, asyncFlowVerbose());
});

test.serial('test virtual replay-membrane', async t => {
  annihilate();
  const zone = makeVirtualZone('virtualRoot');
  return testFirstPlay(t, zone);
});

test.serial('test durable replay-membrane', async t => {
  annihilate();

  nextLife();
  const zone1 = makeDurableZone(getBaggage(), 'durableRoot');
  await testFirstPlay(t, zone1);

  nextLife();
  const zone2 = makeDurableZone(getBaggage(), 'durableRoot');
  await testBadReplay(t, zone2);

  nextLife();
  const zone3 = makeDurableZone(getBaggage(), 'durableRoot');
  return testGoodReplay(t, zone3);
});
