// eslint-disable-next-line import/order
import {
  test,
  getBaggage,
  annihilate,
  nextLife,
} from './prepare-test-env-ava.js';

import { Fail } from '@endo/errors';
import { passStyleOf } from '@endo/pass-style';
import { M, makeCopyMap, matches } from '@endo/patterns';
import { makePromiseKit } from '@endo/promise-kit';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { isVow } from '@agoric/vow/src/vow-utils.js';
import { prepareVowTools } from '@agoric/vow';
import { makeHeapZone } from '@agoric/zone/heap.js';
import { makeVirtualZone } from '@agoric/zone/virtual.js';
import { makeDurableZone } from '@agoric/zone/durable.js';

import { prepareTestAsyncFlowTools } from './_utils.js';

/**
 * @import {Vow} from '@agoric/vow';
 * @import {Zone} from '@agoric/base-zone';
 * @import {AsyncFlow} from '../src/async-flow.js';
 * @import {Narrator} from '../src/replay-membrane.js';
 * @import {GuestReplayFaultHandler} from '../src/types.ts';
 */

/**
 * @param {Zone} zone
 */
const prepareCounter = zone =>
  zone.exoClass(
    'Counter',
    undefined,
    (factor, vow, resolver) => ({ factor, vow, resolver, count: 0 }),
    {
      incr(n) {
        const { state } = this;
        return (state.count += state.factor * n);
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

/** @typedef {ReturnType<ReturnType<typeof prepareCounter>>} HostCounter */

/**
 * For the first incarnation, where we're not replaying, but the guest method
 * is buggy, recording a bad log record for future correct upgrades to cope
 * with.
 *
 * @param {any} t
 * @param {Zone} zone
 */
const testFirstBuggyPlay = async (t, zone) => {
  t.log('testFirstBuggyPlay started');
  const vowTools = prepareVowTools(zone);
  const { makeVowKit } = vowTools;
  const { asyncFlow, adminAsyncFlow } = prepareTestAsyncFlowTools(t, zone, {
    vowTools,
  });
  const makeCounter = prepareCounter(zone);

  const { vow: v0, resolver: r0 } = zone.makeOnce('v0', () => makeVowKit());

  const hCountBy3 = zone.makeOnce('hCountBy3', () => makeCounter(3, v0, r0));

  // purposely violate rule that guestMethod is closed.
  const { promise: promiseStep, resolve: resolveStep } = makePromiseKit();

  const { guestMethod } = {
    async guestMethod(gCountBy3) {
      /** @type {{narrator: Narrator}} */
      // @ts-expect-error TS does not yet understand guest contexts
      const { narrator } = this;
      t.log('  testFirstBuggyPlay');
      t.deepEqual(narrator.getLogDump(), []);
      t.is(narrator.getGeneration(), undefined);
      t.is(narrator.getLogIndex(), 0);
      t.false(narrator.isReplaying());

      // When we author later upgrades, say we consider this call with `2`
      // to be a bug, where later upgrades corrects it to call with `1`.
      t.is(gCountBy3.incr(2), 6);

      t.deepEqual(narrator.getLogDump(), [
        // the narrator returns the guest view of the log
        ['checkCall', gCountBy3, 'incr', [2], 0],
        ['doReturn', 0, 6],
      ]);
      t.is(narrator.getGeneration(), undefined);
      t.is(narrator.getLogIndex(), 2);
      t.false(narrator.isReplaying());

      const p = gCountBy3.vow();
      t.deepEqual(narrator.getLogDump(), [
        // the narrator returns the guest view of the log
        ['checkCall', gCountBy3, 'incr', [2], 0],
        ['doReturn', 0, 6],
        ['checkCall', gCountBy3, 'vow', [], 2],
        ['doReturn', 2, p],
      ]);
      t.is(narrator.getGeneration(), undefined);
      t.is(narrator.getLogIndex(), 4);
      t.false(narrator.isReplaying());

      resolveStep(true);
      t.log('testFirstBuggyPlay to hang awaiting a future incarnation');
      // End of synchronous prelude.
      // Awaiting a promise that won't be resolved during this incarnation
      await p;
      t.fail('must not reach here in first incarnation');
    },
  };

  const wrapperFunc = asyncFlow(zone, 'AsyncFlow1', guestMethod);

  const outcomeV = zone.makeOnce('outcomeV', () => wrapperFunc(hCountBy3));
  t.true(isVow(outcomeV));

  const flow = zone.makeOnce('flow', () =>
    adminAsyncFlow.getFlowForOutcomeVow(outcomeV),
  );
  t.is(passStyleOf(flow), 'remotable');

  // End of synchronous prelude.
  await promiseStep;

  const logDump = flow.dump();
  t.is(logDump.length, 4);
  t.deepEqual(logDump, [
    // The flow returns the actual log, i.e., the host view of the log
    ['checkCall', hCountBy3, 'incr', [2], 0],
    ['doReturn', 0, 6],
    ['checkCall', hCountBy3, 'vow', [], 2],
    ['doReturn', 2, v0],
  ]);
  t.log('testFirstBuggyPlay done');
};

/**
 * For an upgrade with correct code that conflicts with the bad log
 * and without a fault handler for coping with the problem.
 *
 * @param {any} t
 * @param {Zone} zone
 */
const testConflictingGoodReplay = async (t, zone) => {
  t.log('testConflictingGoodReplay started');
  const vowTools = prepareVowTools(zone);
  const { asyncFlow, adminAsyncFlow } = prepareTestAsyncFlowTools(t, zone, {
    vowTools,
    panicHandler: e => {
      // The order of properties should not be significant. But unfortunately,
      // the way we're using it to test means the order needs to match that
      // observed in the test.
      const expectedMsgFault = {
        actualEntry: [
          'checkCall',
          '[Alleged: Counter guest wrapper]',
          'incr',
          [1],
          0,
        ],
        expectedEntry: ['checkCall', '[Seen]', 'incr', [2], 0],
        generation: 0,
        label: 'replay call',
        logIndex: 1,
      };
      t.throws(
        () => {
          throw e;
        },
        {
          message: `Fault handler declined to handle fault ${JSON.stringify(expectedMsgFault)}`,
        },
      );
    },
  });
  void prepareCounter(zone);

  /** @type {HostCounter} */
  const hCountBy3 = zone.makeOnce('hCountBy3', () => Fail`need hCountBy3`);

  // purposely violate rule that guestMethod is closed.
  const { promise: promiseStep, resolve: resolveStep } = makePromiseKit();

  const { guestMethod } = {
    async guestMethod(gCountBy3) {
      /** @type {{narrator: Narrator}} */
      // @ts-expect-error TS does not yet understand guest contexts
      const { narrator } = this;
      t.log('  testConflictingGoodReplay');

      const gDump = narrator.getLogDump();
      const p = gDump[3][2];
      t.deepEqual(gDump, [
        // the narrator returns the guest view of the log
        ['checkCall', gCountBy3, 'incr', [2], 0],
        ['doReturn', 0, 6],
        ['checkCall', gCountBy3, 'vow', [], 2],
        // Since `p` was recovered from this position in the log, this
        // specific comparison is vacuous. However, we do this so we can do
        // the rest of the `t.deepEqual`. Note that we cannot recover the
        // promise in the obvioius way, `gCountBy3.vow()`, because that would
        // be a distinct membrane-crossing operation during replay that
        // was not in the log.
        ['doReturn', 2, p],
      ]);
      t.is(narrator.getGeneration(), 0);
      t.is(narrator.getLogIndex(), 0);
      t.true(narrator.isReplaying());

      resolveStep(true);
      t.log('  testConflictingGoodReplay about to fault');
      // This is a replay fault, which is now considered correct code
      // in conflict with the log from an earlier buggy execution.
      t.is(gCountBy3.incr(1), 3);

      t.fail('testConflictingGoodReplay must not reach here');
      // This would be after replay catches up, if not for the unhandled fault.
      // Because of the `t.fail` above, this is dead code. But we don't comment
      // it out so it is easier for future refactors to notice it.
      t.is(gCountBy3.incr(1), 6);
    },
  };

  // `asyncFlow` can be used simply to re-prepare the guest function
  // by ignoring the returned wrapper function. If the wrapper function is
  // invoked, that would be a *new* activation with a new outcome and
  // flow, and would have nothing to do with the existing one.
  void asyncFlow(zone, 'AsyncFlow1', guestMethod);

  const outcomeV = /** @type {Vow} */ (
    zone.makeOnce('outcomeV', () => Fail`need outcomeV`)
  );
  t.true(isVow(outcomeV));

  const flow = /** @type {AsyncFlow} */ (
    zone.makeOnce('flow', () => Fail`need flow`)
  );
  const flow1 = adminAsyncFlow.getFlowForOutcomeVow(outcomeV);
  t.is(flow, flow1);
  t.is(passStyleOf(flow), 'remotable');

  // End of synchronous prelude.
  await promiseStep;

  const logDump = flow.dump();
  t.is(logDump.length, 4);
  t.deepEqual(logDump, [
    // The flow returns the actual log, i.e., the host view of the log
    ['checkCall', hCountBy3, 'incr', [2], 0],
    ['doReturn', 0, 6],
    ['checkCall', hCountBy3, 'vow', [], 2],
    ['doReturn', 2, hCountBy3.vow()],
  ]);

  const replayProblem = flow.getOptFatalProblem();
  t.true(replayProblem instanceof Error);

  t.deepEqual(
    adminAsyncFlow.getFailures(),
    makeCopyMap([[flow, replayProblem]]),
  );

  t.log('  testConflictingGoodReplay failures', flow.getOptFatalProblem());
  t.log('testConflictingGoodReplay done');
};

/**
 * For an upgrade with correct code that conflicts with the bad log
 * and without a fault handler for coping with the problem.
 *
 * @param {any} t
 * @param {Zone} zone
 */
const testCopingGoodReplay = async (t, zone) => {
  t.log('testCopingGoodReplay started');
  const vowTools = prepareVowTools(zone);
  const { asyncFlow, adminAsyncFlow } = prepareTestAsyncFlowTools(t, zone, {
    vowTools,
  });
  void prepareCounter(zone);

  /** @type {HostCounter} */
  const hCountBy3 = zone.makeOnce('hCountBy3', () => Fail`need hCountBy3`);

  // purposely violate rule that guestMethod is closed.
  const { promise: promiseStep, resolve: resolveStep } = makePromiseKit();

  const { guestMethod } = {
    async guestMethod(gCountBy3) {
      /** @type {{narrator: Narrator}} */
      // @ts-expect-error TS does not yet understand guest contexts
      const { narrator } = this;
      t.log('  testCopingGoodReplay');

      /** @type {GuestReplayFaultHandler} */
      const faultHandler = fault => {
        // @ts-expect-error TS does not yet understand guest contexts
        const { narrator: n } = this;
        t.is(narrator, n);
        if (
          matches(
            fault,
            M.splitRecord({
              expectedEntry: ['checkCall', M.any(), 'incr', [2], M.any()],
              actualEntry: ['checkCall', M.any(), 'incr', [1], M.any()],
            }),
          )
        ) {
          return harden({ kind: 'ignoreDifference' });
        }
        return harden({ kind: 'decline' });
      };
      narrator.registerFaultHandler(faultHandler);

      const gDump = narrator.getLogDump();
      const p = gDump[3][2];
      t.deepEqual(gDump, [
        // the narrator returns the guest view of the log
        ['checkCall', gCountBy3, 'incr', [2], 0],
        ['doReturn', 0, 6],
        ['checkCall', gCountBy3, 'vow', [], 2],
        // Since `p` was recovered from this position in the log, this
        // specific comparison is vacuous. However, we do this so we can do
        // the rest of the `t.deepEqual`. Note that we cannot recover the
        // promise in the obvioius way, `gCountBy3.vow()`, because that would
        // be a distinct membrane-crossing operation during replay that
        // was not in the log.
        ['doReturn', 2, p],
      ]);
      t.is(narrator.getGeneration(), 0);
      t.is(narrator.getLogIndex(), 0);
      t.true(narrator.isReplaying());

      t.log('  testCopingGoodReplay about to fault');
      // This is a replay fault, which is now considered correct code
      // in conflict with the log from an earlier buggy execution.
      const c1 = gCountBy3.incr(1);
      // The two cases here are because we only implement limited fault
      // handling choices.
      // During this test, c1 would only be 6. But we write it this way to
      // illustrate a guest function that can work in a new non-buggy run
      // and work when coping with a bad old log as well.
      t.true(c1 === 3 || c1 === 6);

      const p2 = gCountBy3.vow();
      t.is(p, p2);

      // This would be after replay catches up.
      // This shows another bit of the coping strategy for a guest function
      // that both simply works correctly denovo, and adapts and recover from
      // anticipated bad log entries.
      const c2 = gCountBy3.incr(c1 === 6 ? 0 : 1);
      t.true(c2 === 6 || c2 === 9);

      resolveStep(true);
      // awaiting a promise that will be resolved during this incarnation
      await p;
    },
  };

  // `asyncFlow` can be used simply to re-prepare the guest function
  // by ignoring the returned wrapper function. If the wrapper function is
  // invoked, that would be a *new* activation with a new outcome and
  // flow, and would have nothing to do with the existing one.
  void asyncFlow(zone, 'AsyncFlow1', guestMethod);

  const outcomeV = /** @type {Vow} */ (
    zone.makeOnce('outcomeV', () => Fail`need outcomeV`)
  );
  t.true(isVow(outcomeV));

  const flow = /** @type {AsyncFlow} */ (
    zone.makeOnce('flow', () => Fail`need flow`)
  );
  const flow1 = adminAsyncFlow.getFlowForOutcomeVow(outcomeV);
  t.is(flow, flow1);
  t.is(passStyleOf(flow), 'remotable');

  // End of synchronous prelude.
  await promiseStep;

  const logDump = flow.dump();
  t.is(logDump.length, 6);
  t.deepEqual(logDump, [
    // The flow returns the actual log, i.e., the host view of the log
    ['checkCall', hCountBy3, 'incr', [2], 0],
    ['doReturn', 0, 6],
    ['checkCall', hCountBy3, 'vow', [], 2],
    ['doReturn', 2, hCountBy3.vow()],
    ['checkCall', hCountBy3, 'incr', [0], 4],
    ['doReturn', 4, 6],
  ]);

  const replayProblem = flow.getOptFatalProblem();
  t.is(replayProblem, undefined);

  t.deepEqual(adminAsyncFlow.getFailures(), makeCopyMap([]));

  t.log('  testCopingGoodReplay failures', flow.getOptFatalProblem());
  t.log('testCopingGoodReplay done');
};

test.serial('test heap async-flow', async t => {
  const zone = makeHeapZone('heapRoot');
  return testFirstBuggyPlay(t, zone);
});

test.serial('test virtual async-flow', async t => {
  annihilate();
  const zone = makeVirtualZone('virtualRoot');
  return testFirstBuggyPlay(t, zone);
});

test.serial('test durable async-flow', async t => {
  annihilate();
  const zone1 = makeDurableZone(getBaggage(), 'durableRoot');
  await testFirstBuggyPlay(t, zone1);

  await eventLoopIteration();
  nextLife();
  const zone2 = makeDurableZone(getBaggage(), 'durableRoot');
  await testConflictingGoodReplay(t, zone2);

  await eventLoopIteration();
  nextLife();
  const zone3 = makeDurableZone(getBaggage(), 'durableRoot');
  await testCopingGoodReplay(t, zone3);

  // await eventLoopIteration();
  // nextLife();
  // const zone4 = makeDurableZone(getBaggage(), 'durableRoot');
  // return testAfterPlay(t, zone4);
});
