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
import { makeHeapZone } from '@agoric/zone/heap.js';
import { makeVirtualZone } from '@agoric/zone/virtual.js';
import { makeDurableZone } from '@agoric/zone/durable.js';

import { prepareTestAsyncFlowTools } from './_utils.js';

/**
 * @import {PromiseKit} from '@endo/promise-kit'
 * @import {Zone} from '@agoric/base-zone'
 */

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

/**
 * @param {any} t
 * @param {Zone} zone
 */
const testBadHostFirstPlay = async (t, zone) => {
  t.log('badHost firstPlay started');
  const vowTools = prepareVowTools(zone);
  const { asyncFlow, adminAsyncFlow } = prepareTestAsyncFlowTools(t, zone, {
    vowTools,
    panicHandler: e => {
      t.throws(
        () => {
          throw e;
        },
        { message: '[3]: [0]: cannot yet send guest promises "[Promise]"' },
      );
    },
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
        message:
          'In a Failed state: see getFailures() or getOptFatalProblem() for more information',
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
  // Allow panicHandler to be called.
  await eventLoopIteration();
};

/**
 * @param {any} t
 * @param {Zone} zone
 */
const testBadHostReplay1 = async (t, zone) => {
  t.log('badHost replay1 started');
  const vowTools = prepareVowTools(zone);
  const { asyncFlow, adminAsyncFlow } = prepareTestAsyncFlowTools(t, zone, {
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
            'converting badMethod result: Remotables must be explicitly declared: "[Function nonPassableFunc]"',
        },
      );
      t.log('  badHost replay1 guest error caused by host error', gErr);

      // show that flow is not Failed by host error
      badResult = 'fine';
      t.is(badGuest.badMethod(), 'fine');

      resolveStep(true);
      t.log('  badHost replay1 to hang awaiting p1');
      // awaiting a promise that won't be resolved until next incarnation
      await p1;
      t.fail('must not reach here in replay 1');
    },
  };

  asyncFlow(zone, 'AsyncFlow1', guestMethod);

  const badHost = zone.makeOnce('badHost', () => Fail`need badHost`);

  const outcomeV = zone.makeOnce('outcomeV', () => Fail`need outcomeV`);

  const flow = adminAsyncFlow.getFlowForOutcomeVow(outcomeV);
  await promiseStep;

  const logDump = flow.dump();

  t.deepEqual(logDump, [
    ['checkCall', badHost, 'badMethod', [], 0],
    ['doReturn', 0, undefined],
    ['checkCall', badHost, 'badMethod', [], 2],
    [
      'doThrow',
      2,
      Error(
        'converting badMethod result: Remotables must be explicitly declared: "[Function nonPassableFunc]"',
      ),
    ],
    ['checkCall', badHost, 'badMethod', [], 4],
    ['doReturn', 4, 'fine'],
  ]);
  t.log('badHost replay1 done');
};

test.serial('test heap async-flow bad host', async t => {
  const zone = makeHeapZone('heapRoot');
  return testBadHostFirstPlay(t, zone);
});

test.serial('test virtual async-flow bad host', async t => {
  annihilate();
  const zone = makeVirtualZone('virtualRoot');
  return testBadHostFirstPlay(t, zone);
});

test.serial('test durable async-flow bad host', async t => {
  annihilate();
  const zone1 = makeDurableZone(getBaggage(), 'durableRoot');
  await testBadHostFirstPlay(t, zone1);

  await eventLoopIteration();

  nextLife();
  const zone3 = makeDurableZone(getBaggage(), 'durableRoot');
  return testBadHostReplay1(t, zone3);
});
