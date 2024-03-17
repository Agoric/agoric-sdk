// eslint-disable-next-line import/order
import {
  test,
  getBaggage,
  annihilate,
  nextLife,
  asyncFlowVerbose,
} from '../prepare-test-env-ava.js';

import { Fail } from '@endo/errors';
// import { E } from '@endo/far';
// import E from '@agoric/vow/src/E.js';
import { passStyleOf } from '@endo/pass-style';
import { makeCopyMap } from '@endo/patterns';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { isVow } from '@agoric/vow/src/vow-utils.js';
import { makePromiseKit } from '@endo/promise-kit';
import { prepareVowTools } from '@agoric/vow';
import { prepareVowTools as prepareWatchableVowTools } from '@agoric/vat-data/vow.js';
import { prepareAsyncFlowTools } from '../../src/async-flow/async-flow.js';

import { makeHeapZone } from '../../heap.js';
import { makeVirtualZone } from '../../virtual.js';
import { makeDurableZone } from '../../durable.js';

const { apply } = Reflect;

/**
 * @param {import('@agoric/base-zone').Zone} zone
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

/** @typedef {ReturnType<ReturnType<prepareOrchestra>>} Orchestra */

const firstLogLen = 7;

/**
 * @param {any} t
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {import('@agoric/vow').VowTools} vowTools
 * @param {boolean} [showOnConsole]
 */
const testFirstPlay = async (t, zone, vowTools, showOnConsole = false) => {
  if (showOnConsole) {
    console.log('firstPlay started');
  }
  const { asyncFlow, adminAsyncFlow } = prepareAsyncFlowTools(zone, {
    vowTools,
  });
  const makeOrchestra = prepareOrchestra(zone);
  const { makeVowKit } = vowTools;

  const { vow: v1, resolver: r1 } = zone.makeOnce('v1', () => makeVowKit());
  const { vow: v2, resolver: r2 } = zone.makeOnce('v2', () => makeVowKit());
  const hOrch7 = zone.makeOnce('hOrch7', () => makeOrchestra(7, v2, r2));

  // purposely violate rule that guestMethod is closed.
  const { promise: promiseTestDone, resolve: endTest } = makePromiseKit();

  const { guestMethod } = {
    async guestMethod(gOrch7, gP) {
      t.is(this, 'context');
      if (showOnConsole) {
        console.log('  firstPlay about to await gP');
      }
      await gP;
      const g2 = gOrch7.vow();
      const prod = gOrch7.scale(3);
      t.is(prod, 21);

      let gErr;
      try {
        gOrch7.scale(9n);
      } catch (e) {
        gErr = e;
      }
      t.is(gErr.name, 'TypeError');

      endTest(true);
      if (showOnConsole) {
        console.log('  firstPlay to hang awaiting g2');
      }
      await g2; // awaiting a promise that won't be resolved until next turn
      t.fail('must not reach here in first incarnation');
    },
  };

  const wrapperFunc = asyncFlow(zone, 'AsyncFlow1', guestMethod);

  const outcomeV = zone.makeOnce('outcomeV', () =>
    apply(wrapperFunc, 'context', [hOrch7, v1]),
  );

  t.true(isVow(outcomeV));
  r1.resolve('x');

  const flow = adminAsyncFlow.getFlowForOutcomeVow(outcomeV);
  t.is(passStyleOf(flow), 'remotable');

  await promiseTestDone;

  const logDump = flow.dump();
  t.is(logDump.length, firstLogLen);
  t.deepEqual(logDump, [
    ['doFulfill', v1, 'x'],
    ['checkCall', hOrch7, 'vow', [], 1],
    ['doReturn', 1, v2],
    ['checkCall', hOrch7, 'scale', [3], 3],
    ['doReturn', 3, 21],
    ['checkCall', hOrch7, 'scale', [9n], 5],
    [
      'doThrow',
      5,
      TypeError('Cannot mix BigInt and other types, use explicit conversions'),
    ],
  ]);
  if (showOnConsole) {
    console.log('firstPlay done');
  }
  return promiseTestDone;
};

/**
 * @param {any} t
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {import('@agoric/vow').VowTools} vowTools
 * @param {boolean} [showOnConsole]
 */
const testBadReplay = async (t, zone, vowTools, showOnConsole = false) => {
  if (showOnConsole) {
    console.log('badReplay started');
  }
  const { asyncFlow, adminAsyncFlow } = prepareAsyncFlowTools(zone, {
    vowTools,
  });
  prepareOrchestra(zone);
  const { when } = vowTools;
  const hOrch7 = /** @type {Orchestra} */ (
    zone.makeOnce('hOrch7', () => Fail`hOrch7 expected`)
  );
  // purposely violate rule that guestMethod is closed.
  const { promise: promiseTestDone, resolve: endTest } = makePromiseKit();

  const { guestMethod } = {
    async guestMethod(gOrch7, gP) {
      t.is(this, 'context');
      if (showOnConsole) {
        console.log('  badReplay about to await gP');
      }
      endTest(true);
      await gP;
      const g2 = gOrch7.vow();
      // This is a replay error
      const prod = gOrch7.scale(4);
      // Well, its gotta be something
      t.is(prod, undefined);
      t.is(gOrch7.scale(9n), undefined);

      if (showOnConsole) {
        console.log('  badReplay about to await g2');
      }
      await g2; // because of the replay failure, g2 should not settle
      t.fail('badReplay must not reach here');
    },
  };

  // `asyncFlow` can be used simply to re-prepare the guest function
  // by ignoring the returned wrapper function. If the wrapper function is
  // invoked, that would be a *new* activation with a new outcome and
  // flow, and would have nothing to do with the existing one.
  asyncFlow(zone, 'AsyncFlow1', guestMethod);

  const outcomeV = /** @type {Vow} */ (
    zone.makeOnce('outcomeV', () => Fail`outcomeV expected`)
  );

  hOrch7.resolve('y');
  // TODO I shouldn't need to do this.
  await adminAsyncFlow.wakeAll();
  t.is(await when(hOrch7.vow()), 'y');

  const flow = adminAsyncFlow.getFlowForOutcomeVow(outcomeV);
  t.is(passStyleOf(flow), 'remotable');

  const logDump = flow.dump();
  t.is(logDump.length, firstLogLen);

  const replayProblem = flow.getOptFatalProblem();
  t.true(replayProblem instanceof Error);

  t.deepEqual(
    adminAsyncFlow.getFailures(),
    makeCopyMap([[flow, replayProblem]]),
  );

  if (showOnConsole) {
    console.log('  badReplay failure', flow.getOptFatalProblem().message);
    console.log('badReplay done', await promiseTestDone);
  }
  return promiseTestDone;
};

/**
 * @param {any} t
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {import('@agoric/vow').VowTools} vowTools
 * @param {boolean} [showOnConsole]
 */
const testGoodReplay = async (t, zone, vowTools, showOnConsole = false) => {
  if (showOnConsole) {
    console.log('goodReplay started');
  }
  const { asyncFlow, adminAsyncFlow } = prepareAsyncFlowTools(zone, {
    vowTools,
  });
  prepareOrchestra(zone);
  const { when } = vowTools;
  const hOrch7 = /** @type {Orchestra} */ (
    zone.makeOnce('hOrch7', () => Fail`hOrch7 expected`)
  );
  // purposely violate rule that guestMethod is closed.
  const { promise: promiseTestDone, resolve: endTest } = makePromiseKit();

  const { guestMethod } = {
    async guestMethod(gOrch7, gP) {
      t.is(this, 'context');
      if (showOnConsole) {
        console.log('  goodReplay about to await gP');
      }
      await gP;
      const g2 = gOrch7.vow();
      const prod = gOrch7.scale(3);
      t.is(prod, 21);

      let gErr;
      try {
        gOrch7.scale(9n);
      } catch (e) {
        gErr = e;
      }
      t.is(gErr.name, 'TypeError');

      endTest(true);
      if (showOnConsole) {
        console.log('  goodReplay about to await g2');
      }
      await g2; // awaiting a promise that won't be resolved until this turn
      if (showOnConsole) {
        console.log('  goodReplay woke up!');
      }
      endTest('done');
    },
  };

  // `asyncFlow` can be used simply to re-prepare the guest function
  // by ignoring the returned wrapper function. If the wrapper function is
  // invoked, that would be a *new* activation with a new outcome and
  // flow, and would have nothing to do with the existing one.
  asyncFlow(zone, 'AsyncFlow1', guestMethod);

  const outcomeV = /** @type {Vow} */ (
    zone.makeOnce('outcomeV', () => Fail`outcomeV expected`)
  );

  hOrch7.resolve('y');
  // TODO I shouldn't need to do this.
  await adminAsyncFlow.wakeAll();
  const v2 = hOrch7.vow();
  t.is(await when(v2), 'y');

  const flow = adminAsyncFlow.getFlowForOutcomeVow(outcomeV);
  t.is(passStyleOf(flow), 'remotable');

  await promiseTestDone;

  const logDump = flow.dump();
  t.is(logDump.length, firstLogLen + 1);
  t.deepEqual(logDump.slice(firstLogLen), [
    // comment to keep on a separate line
    ['doFulfill', v2, 'y'],
  ]);

  t.is(await when(outcomeV), undefined);
  t.deepEqual(flow.dump(), []);

  if (showOnConsole) {
    console.log('goodReplay done', await promiseTestDone);
  }
};

/**
 * @param {any} t
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {import('@agoric/vow').VowTools} vowTools
 * @param {boolean} [showOnConsole]
 */
const testAfterPlay = async (t, zone, vowTools, showOnConsole = false) => {
  if (showOnConsole) {
    console.log('testAfterPlay started');
  }
  const { asyncFlow, adminAsyncFlow } = prepareAsyncFlowTools(zone, {
    vowTools,
  });
  prepareOrchestra(zone);
  const { when } = vowTools;
  const hOrch7 = /** @type {Orchestra} */ (
    zone.makeOnce('hOrch7', () => Fail`hOrch7 expected`)
  );

  const { guestMethod } = {
    async guestMethod(_gOrch7, _gP) {
      t.fail('Must not replay this');
    },
  };

  // `asyncFlow` can be used simply to re-prepare the guest function
  // by ignoring the returned wrapper function. If the wrapper function is
  // invoked, that would be a *new* activation with a new outcome and
  // flow, and would have nothing to do with the existing one.
  asyncFlow(zone, 'AsyncFlow1', guestMethod);

  const outcomeV = /** @type {Vow} */ (
    zone.makeOnce('outcomeV', () => Fail`outcomeV expected`)
  );

  hOrch7.resolve('y');
  t.is(await when(hOrch7.vow()), 'y');

  const flow = adminAsyncFlow.getFlowForOutcomeVow(outcomeV);
  t.is(passStyleOf(flow), 'remotable');

  t.deepEqual(flow.dump(), []);

  if (showOnConsole) {
    console.log('testAfterDoneReplay done');
  }
};

await test.serial('test heap async-flow', async t => {
  const zone = makeHeapZone('heapRoot');
  const vowTools = prepareVowTools(zone);
  return testFirstPlay(t, zone, vowTools, asyncFlowVerbose());
});

await test.serial('test virtual async-flow', async t => {
  annihilate();
  const zone = makeVirtualZone('virtualRoot');
  const vowTools = prepareVowTools(zone);
  return testFirstPlay(t, zone, vowTools);
});

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
  await testBadReplay(t, zone2, vowTools2);

  await eventLoopIteration();

  nextLife();
  const zone3 = makeDurableZone(getBaggage(), 'durableRoot');
  const vowTools3 = prepareWatchableVowTools(zone3);
  await testGoodReplay(t, zone3, vowTools3);

  await eventLoopIteration();

  nextLife();
  const zone4 = makeDurableZone(getBaggage(), 'durableRoot');
  const vowTools4 = prepareWatchableVowTools(zone4);
  await testAfterPlay(t, zone4, vowTools4, asyncFlowVerbose());

  await eventLoopIteration();
});
