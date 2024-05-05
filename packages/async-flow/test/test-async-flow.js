// eslint-disable-next-line import/order
import {
  test,
  getBaggage,
  annihilate,
  nextLife,
} from './prepare-test-env-ava.js';

import { Fail } from '@endo/errors';
import { passStyleOf } from '@endo/pass-style';
import { makeCopyMap } from '@endo/patterns';
import { makePromiseKit } from '@endo/promise-kit';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { isVow } from '@agoric/vow/src/vow-utils.js';
import { prepareVowTools } from '@agoric/vow';
import { prepareVowTools as prepareWatchableVowTools } from '@agoric/vat-data/vow.js';
import { makeHeapZone } from '@agoric/zone/heap.js';
import { makeVirtualZone } from '@agoric/zone/virtual.js';
import { makeDurableZone } from '@agoric/zone/durable.js';

import { prepareAsyncFlowTools } from '../src/async-flow.js';

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

/** @typedef {ReturnType<ReturnType<prepareOrchestra>>} Orchestra */

const firstLogLen = 7;

// TODO https://github.com/Agoric/agoric-sdk/issues/9231

/**
 * @param {any} t
 * @param {Zone} zone
 * @param {VowTools} vowTools
 */
const testFirstPlay = async (t, zone, vowTools) => {
  t.log('firstPlay started');
  const { asyncFlow, adminAsyncFlow } = prepareAsyncFlowTools(zone, {
    vowTools,
  });
  const makeOrchestra = prepareOrchestra(zone);
  const { makeVowKit } = vowTools;

  const { vow: v1, resolver: r1 } = zone.makeOnce('v1', () => makeVowKit());
  const { vow: v2, resolver: r2 } = zone.makeOnce('v2', () => makeVowKit());
  const { vow: v3, resolver: _r3 } = zone.makeOnce('v3', () => makeVowKit());
  const hOrch7 = zone.makeOnce('hOrch7', () => makeOrchestra(7, v2, r2));

  // purposely violate rule that guestMethod is closed.
  const { promise: promiseStep, resolve: resolveStep } = makePromiseKit();

  const { guestMethod } = {
    async guestMethod(gOrch7, gP, _p3) {
      t.log('  firstPlay about to await gP');
      await gP;
      const p2 = gOrch7.vow();
      const prod = gOrch7.scale(3);
      t.is(prod, 21);

      let gErr;
      try {
        gOrch7.scale(9n);
      } catch (e) {
        gErr = e;
      }
      t.is(gErr.name, 'TypeError');

      resolveStep(true);
      t.log('  firstPlay to hang awaiting p2');
      // awaiting a promise that won't be resolved until next incarnation
      await p2;
      t.fail('must not reach here in first incarnation');
    },
  };

  const wrapperFunc = asyncFlow(zone, 'AsyncFlow1', guestMethod);

  const outcomeV = zone.makeOnce('outcomeV', () => wrapperFunc(hOrch7, v1, v3));

  t.true(isVow(outcomeV));
  r1.resolve('x');

  const flow = adminAsyncFlow.getFlowForOutcomeVow(outcomeV);
  t.is(passStyleOf(flow), 'remotable');

  await promiseStep;

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
  t.log('firstPlay done');
  return promiseStep;
};

/**
 * @param {any} t
 * @param {Zone} zone
 * @param {VowTools} vowTools
 */
const testBadReplay = async (t, zone, vowTools) => {
  t.log('badReplay started');
  const { asyncFlow, adminAsyncFlow } = prepareAsyncFlowTools(zone, {
    vowTools,
  });
  prepareOrchestra(zone);
  const { when } = vowTools;
  const hOrch7 = /** @type {Orchestra} */ (
    zone.makeOnce('hOrch7', () => Fail`need hOrch7`)
  );
  // purposely violate rule that guestMethod is closed.
  const { promise: promiseStep, resolve: resolveStep } = makePromiseKit();

  const { guestMethod } = {
    async guestMethod(gOrch7, gP, _p3) {
      t.log('  badReplay about to await gP');
      resolveStep(true);
      await gP;
      gOrch7.vow();
      // This is a replay error
      gOrch7.scale(4);
      t.fail('badReplay must not reach here');
    },
  };

  // `asyncFlow` can be used simply to re-prepare the guest function
  // by ignoring the returned wrapper function. If the wrapper function is
  // invoked, that would be a *new* activation with a new outcome and
  // flow, and would have nothing to do with the existing one.
  asyncFlow(zone, 'AsyncFlow1', guestMethod);

  const outcomeV = /** @type {Vow} */ (
    zone.makeOnce('outcomeV', () => Fail`need outcomeV`)
  );

  // This unblocks `await p2;` but only after the replay failure is fixed in
  // the next incarnation.
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

  t.log('  badReplay failures', flow.getOptFatalProblem());
  t.log('badReplay done', await promiseStep);
  return promiseStep;
};

/**
 * @param {any} t
 * @param {Zone} zone
 * @param {VowTools} vowTools
 */
const testGoodReplay = async (t, zone, vowTools) => {
  t.log('goodReplay started');
  const { asyncFlow, adminAsyncFlow } = prepareAsyncFlowTools(zone, {
    vowTools,
  });
  prepareOrchestra(zone, 2); // Note change in new behavior
  const { when } = vowTools;
  const hOrch7 = /** @type {Orchestra} */ (
    zone.makeOnce('hOrch7', () => Fail`need hOrch7`)
  );
  // purposely violate rule that guestMethod is closed.
  const { promise: promiseStep, resolve: resolveStep } = makePromiseKit();

  const { guestMethod } = {
    async guestMethod(gOrch7, gP, p3) {
      t.log('  goodReplay about to await gP');
      await gP;
      const p2 = gOrch7.vow();
      const prod = gOrch7.scale(3);
      t.is(prod, 21);

      let gErr;
      try {
        gOrch7.scale(9n);
      } catch (e) {
        gErr = e;
      }
      t.is(gErr.name, 'TypeError');

      resolveStep(true);
      t.log('  goodReplay about to await p2');
      // awaiting a promise that won't be resolved until this incarnation
      await p2;
      t.log('  goodReplay woke up!');
      const prod2 = gOrch7.scale(3);
      // same question. different answer
      t.is(prod2, 42);
      t.log('about to await p3');
      await p3;
      t.log('p3 settled');
    },
  };

  // `asyncFlow` can be used simply to re-prepare the guest function
  // by ignoring the returned wrapper function. If the wrapper function is
  // invoked, that would be a *new* activation with a new outcome and
  // flow, and would have nothing to do with the existing one.
  asyncFlow(zone, 'AsyncFlow1', guestMethod);

  const outcomeV = /** @type {Vow} */ (
    zone.makeOnce('outcomeV', () => Fail`need outcomeV`)
  );

  // TODO I shouldn't need to do this.
  await adminAsyncFlow.wakeAll();
  const v2 = hOrch7.vow();
  t.is(await when(v2), 'y');
  await eventLoopIteration();

  const flow = adminAsyncFlow.getFlowForOutcomeVow(outcomeV);
  t.is(passStyleOf(flow), 'remotable');

  await promiseStep;

  const { vow: v1 } = zone.makeOnce('v1', () => Fail`need v1`);
  const { resolver: r3 } = zone.makeOnce('v3', () => Fail`need v3`);

  const logDump = flow.dump();
  t.is(logDump.length, firstLogLen + 3);
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
    // new stuff
    ['doFulfill', v2, 'y'],
    ['checkCall', hOrch7, 'scale', [3], firstLogLen + 1],
    // same question. different answer
    ['doReturn', firstLogLen + 1, 42],
  ]);

  // @ts-expect-error TS doesn't know it is a resolver
  r3.resolve('done');
  await eventLoopIteration();

  t.is(await when(outcomeV), undefined);
  t.deepEqual(flow.dump(), []);

  t.log('goodReplay done', await promiseStep);
};

/**
 * @param {any} t
 * @param {Zone} zone
 * @param {VowTools} vowTools
 */
const testAfterPlay = async (t, zone, vowTools) => {
  t.log('testAfterPlay started');
  const { asyncFlow, adminAsyncFlow } = prepareAsyncFlowTools(zone, {
    vowTools,
  });
  prepareOrchestra(zone);

  const { guestMethod } = {
    async guestMethod(_gOrch7, _gP, _p3) {
      t.fail('Must not replay this');
    },
  };

  // `asyncFlow` can be used simply to re-prepare the guest function
  // by ignoring the returned wrapper function. If the wrapper function is
  // invoked, that would be a *new* activation with a new outcome and
  // flow, and would have nothing to do with the existing one.
  asyncFlow(zone, 'AsyncFlow1', guestMethod);

  const outcomeV = /** @type {Vow} */ (
    zone.makeOnce('outcomeV', () => Fail`need outcomeV`)
  );

  t.throws(() => adminAsyncFlow.getFlowForOutcomeVow(outcomeV), {
    message:
      'key "[Alleged: VowInternalsKit vowV0]" not found in collection "flowForOutcomeVow"',
  });

  t.log('testAfterDoneReplay done');
};

await test.serial('test heap async-flow', async t => {
  const zone = makeHeapZone('heapRoot');
  const vowTools = prepareVowTools(zone);
  return testFirstPlay(t, zone, vowTools);
});

await test.serial('test virtual async-flow', async t => {
  annihilate();
  const zone = makeVirtualZone('virtualRoot');
  const vowTools = prepareVowTools(zone);
  return testFirstPlay(t, zone, vowTools);
});

await test.serial('test durable async-flow', async t => {
  annihilate();
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
  return testAfterPlay(t, zone4, vowTools4);
});
