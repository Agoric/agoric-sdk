// eslint-disable-next-line import/order
import {
  test,
  getBaggage,
  annihilate,
  nextLife,
} from './prepare-test-env-ava.js';

import { Fail } from '@endo/errors';
import { M } from '@endo/patterns';
import { makePromiseKit } from '@endo/promise-kit';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { prepareVowTools } from '@agoric/vow';
import { prepareVowTools as prepareWatchableVowTools } from '@agoric/vat-data/vow.js';
import { makeHeapZone } from '@agoric/zone/heap.js';
import { makeVirtualZone } from '@agoric/zone/virtual.js';
import { makeDurableZone } from '@agoric/zone/durable.js';

import { prepareAsyncFlowTools } from '../src/async-flow.js';

const nonPassableFunc = () => 'non-passable-function';
harden(nonPassableFunc);
const guestCreatedPromise = harden(Promise.resolve('guest-created'));
let badResult;

/**
 * @param {Zone} zone
 */
const prepareBadHost = zone =>
  zone.exoClass(
    'BadHost',
    M.interface('BadHost', {}, { defaultGuards: 'raw' }),
    () => ({}),
    {
      badMethod(_badArg = undefined) {
        return badResult;
      },
    },
  );

/** @typedef {ReturnType<ReturnType<prepareBadHost>>} BadHost */

// TODO https://github.com/Agoric/agoric-sdk/issues/9231

/**
 * @param {any} t
 * @param {Zone} zone
 * @param {VowTools} vowTools
 */
const testBadHostFirstPlay = async (t, zone, vowTools) => {
  t.log('badHost firstPlay started');
  const { asyncFlow, adminAsyncFlow } = prepareAsyncFlowTools(zone, {
    vowTools,
  });
  const makeBadHost = prepareBadHost(zone);
  const { makeVowKit } = vowTools;

  const { vow: v1, resolver: _r1 } = zone.makeOnce('v1', () => makeVowKit());
  // purposely violate rule that guestMethod is closed.
  const { promise: promiseStep, resolve: resolveStep } = makePromiseKit();

  const { guestMethod } = {
    async guestMethod(badGuest, _p1) {
      // nothing bad yet baseline
      t.is(badGuest.badMethod(), undefined);

      t.throws(() => badGuest.badMethod(guestCreatedPromise), {
        message: 'In a Failed state: see getFailures() for more information',
      });

      resolveStep(true);
      t.log('  badHost firstPlay about to return "bogus"');
      // Must not settle outcomeVow
      return 'bogus';
    },
  };

  const wrapperFunc = asyncFlow(zone, 'AsyncFlow1', guestMethod);

  const badHost = zone.makeOnce('badHost', () => makeBadHost());

  const outcomeV = zone.makeOnce('outcomeV', () => wrapperFunc(badHost, v1));

  const flow = adminAsyncFlow.getFlowForOutcomeVow(outcomeV);
  await promiseStep;

  const fatalProblem = flow.getOptFatalProblem();
  t.throws(
    () => {
      throw fatalProblem;
    },
    {
      message: '[3]: [0]: cannot yet send guest promises "[Promise]"',
    },
  );

  t.deepEqual(flow.dump(), [
    ['checkCall', badHost, 'badMethod', [], 0],
    ['doReturn', 0, undefined],
    // Notice that the bad call was not recorded in the log
  ]);
  t.log('badHost firstPlay done');
  return promiseStep;
};

/**
 * @param {any} t
 * @param {Zone} zone
 * @param {VowTools} vowTools
 */
const testBadHostReplay1 = async (t, zone, vowTools) => {
  t.log('badHost replay1 started');
  const { asyncFlow, adminAsyncFlow } = prepareAsyncFlowTools(zone, {
    vowTools,
  });
  prepareBadHost(zone);

  // const { vow: v1, resolver: r1 } = zone.makeOnce('v1', () => Fail`need v1`);
  // purposely violate rule that guestMethod is closed.
  const { promise: promiseStep, resolve: resolveStep } = makePromiseKit();

  const { guestMethod } = {
    async guestMethod(badGuest, p1) {
      // nothing bad yet baseline
      t.is(badGuest.badMethod(), undefined);

      // purposely violate rule that guestMethod is closed.
      badResult = nonPassableFunc;

      let gErr;
      try {
        badGuest.badMethod();
      } catch (err) {
        gErr = err;
      }
      t.throws(
        () => {
          throw gErr;
        },
        {
          message:
            // Be compat with before and after
            // https://github.com/endojs/endo/pull/2267
            /converting badMethod result:/,
        },
      );
      t.log('  badHost replay1 guest error caused by host error', gErr);

      resolveStep(true);
      t.log('  badHost replay1 to hang awaiting p2');
      // awaiting a promise that won't be resolved until next incarnation
      await p1;
      t.fail('must not reach here in replay 1');
    },
  };

  asyncFlow(zone, 'AsyncFlow1', guestMethod);

  const badHost = zone.makeOnce('badHost', () => Fail`need badHost`);

  const outcomeV = zone.makeOnce('outcomeV', () => Fail`need outcomeV`);

  // TODO I shouldn't need to do this.
  await adminAsyncFlow.wakeAll();

  const flow = adminAsyncFlow.getFlowForOutcomeVow(outcomeV);
  await promiseStep;

  const logDump = flow.dump();
  // Be compat with before and after
  // https://github.com/endojs/endo/pull/2267
  const message = logDump[3][2].message;

  t.deepEqual(logDump, [
    ['checkCall', badHost, 'badMethod', [], 0],
    ['doReturn', 0, undefined],
    ['checkCall', badHost, 'badMethod', [], 2],
    ['doThrow', 2, Error(message)],
  ]);
  t.log('badHost replay1 done');
  return promiseStep;
};

await test.serial('test heap async-flow bad host', async t => {
  const zone = makeHeapZone('heapRoot');
  const vowTools = prepareVowTools(zone);
  return testBadHostFirstPlay(t, zone, vowTools);
});

await test.serial('test virtual async-flow bad host', async t => {
  annihilate();
  const zone = makeVirtualZone('virtualRoot');
  const vowTools = prepareVowTools(zone);
  return testBadHostFirstPlay(t, zone, vowTools);
});

await test.serial('test durable async-flow bad host', async t => {
  annihilate();
  const zone1 = makeDurableZone(getBaggage(), 'durableRoot');
  const vowTools1 = prepareWatchableVowTools(zone1);
  await testBadHostFirstPlay(t, zone1, vowTools1);

  await eventLoopIteration();

  nextLife();
  const zone3 = makeDurableZone(getBaggage(), 'durableRoot');
  const vowTools3 = prepareWatchableVowTools(zone3);
  return testBadHostReplay1(t, zone3, vowTools3);
});
