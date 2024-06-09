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
import { makeDurableZone } from '@agoric/zone/durable.js';

import { prepareAsyncFlowTools } from '../src/async-flow.js';

/**
 * @import {AsyncFlow} from '../src/async-flow.js'
 */

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

/**
 * @param {any} t
 * @param {Zone} zone
 */
const testFirstPlay = async (t, zone) => {
  t.log('firstPlay started');
  const vowTools = prepareVowTools(zone);
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
    async guestMethod(gOrch7, g1, _p3) {
      t.log('  firstPlay about to await g1');
      t.is(await g1, 'x');
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

  const flow = zone.makeOnce('flow', () =>
    adminAsyncFlow.getFlowForOutcomeVow(outcomeV),
  );
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
};

/**
 * Test from bug https://github.com/Agoric/agoric-sdk/issues/9465
 *
 * @param {any} t
 * @param {Zone} zone
 */
const testBadShortReplay = async (t, zone) => {
  t.log('badShortReplay started');
  const vowTools = prepareVowTools(zone);
  const { asyncFlow, adminAsyncFlow } = prepareAsyncFlowTools(zone, {
    vowTools,
  });
  prepareOrchestra(zone);
  const { when } = vowTools;

  // purposely violate rule that guestMethod is closed.
  const { promise: promiseStep, resolve: resolveStep } = makePromiseKit();

  const { guestMethod } = {
    async guestMethod(_gOrch7, _g1, _p3) {
      t.log('  badReplay return early');
      resolveStep(true);
      return 'bad';
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
  const flow = /** @type {AsyncFlow} */ (
    zone.makeOnce('flow', () => Fail`need flow`)
  );
  const flow1 = adminAsyncFlow.getFlowForOutcomeVow(outcomeV);
  t.is(flow, flow1);
  t.is(passStyleOf(flow), 'remotable');

  await promiseStep;

  const replayProblem = flow.getOptFatalProblem();
  t.log('  badShortReplay failures', replayProblem);
  t.true(replayProblem instanceof Error);

  const outcome = when(outcomeV);
  await eventLoopIteration();

  t.is(await Promise.race([outcome, Promise.resolve('good')]), 'good');

  t.deepEqual(
    adminAsyncFlow.getFailures(),
    makeCopyMap([[flow, replayProblem]]),
  );

  t.log('badShortReplay done');
};

test.serial.failing('test durable async-flow early completion', async t => {
  annihilate();
  const zone1 = makeDurableZone(getBaggage(), 'durableRoot');
  await testFirstPlay(t, zone1);

  await eventLoopIteration();

  nextLife();
  const zone2a = makeDurableZone(getBaggage(), 'durableRoot');
  await testBadShortReplay(t, zone2a);
});
