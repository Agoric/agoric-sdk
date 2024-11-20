/* eslint-env node */
// eslint-disable-next-line import/order
import { test, getBaggage, annihilate } from './prepare-test-env-ava.js';

import { passStyleOf } from '@endo/pass-style';
import { makePromiseKit } from '@endo/promise-kit';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { isVow } from '@agoric/vow/src/vow-utils.js';
import { prepareVowTools } from '@agoric/vow';
import { makeDurableZone } from '@agoric/zone/durable.js';

import { prepareTestAsyncFlowTools } from './_utils.js';
import { consoleRecorder, originalConsole } from './console-recorder-shim.js';

/**
 * @import {Zone} from '@agoric/base-zone';
 * @import {ExecutionContext} from 'ava';
 */

/**
 * @param {ExecutionContext<unknown>} t
 * @param {any} hOrch
 * @param {any} reason
 * @param {any[]} [recording]
 */
const rejectionRecordingAssertions = (t, hOrch, reason, recording) => {
  assert(recording);

  // console.log(
  //   '@@@ recording was:',
  //   recording.map(({ method, args }, i) => ({ i, method, args })),
  // );
  const cons = (method, ...args) => ({
    method,
    args,
  });

  t.true(recording.every(entry => entry.thisArg === originalConsole));

  // The recording must have at least the entries we have in the expected
  // pattern below.
  const recLen17 = Math.max(recording.length, 17);

  // Check the guestMethod stack trace exists.
  const indexToStackRegex = {
    2: /\bdoReject\b/,
    8: /\sIn "reject" method of \(Orchestra\)\s/,
    [recLen17 - 5]: /\basync-flow-debug\b/,
    [recLen17 - 2]: /\basyncFlow\b.*\btestRejectionPlay\b/s,
  };

  const consStack = i => {
    const re = indexToStackRegex[i];
    delete indexToStackRegex[i];
    t.truthy(re, `recorded entry ${i} has a stack regex`);
    t.is(recording[i].args.length, 1, `recorded entry ${i} has one arg`);
    t.is(
      typeof recording[i].args[0],
      'string',
      `recorded entry ${i} arg is a string`,
    );
    t.regex(recording[i].args[0], re, `recorded entry ${i} maches stack regex`);
    return { method: 'error' };
  };

  const consSentAs = i => {
    t.is(recording[i].args.length, 3, `recorded entry ${i} has three args`);
    return {
      method: 'error',
      args: ['Error#2 ERROR_NOTE:', 'Sent as'],
    };
  };

  const error = (...args) => cons('error', ...args);
  const group = (...args) => cons('group', ...args);

  const expectedRecording = {
    length: recLen17,
    0: error('p2 rejection:', '(Error#1)'),
    1: error('Error#1:', reason.message),
    2: consStack(2),
    3: error('Error#1 ERROR_NOTE:', 'from host error', '(Error#2)'),
    4: error(
      'Error#1 ERROR_NOTE:',
      'from flow',
      'AsyncFlow1',
      'defined at',
      '(Error#3)',
    ),
    5: error(
      'Error#1 ERROR_NOTE:',
      'host rejection from call to (',
      hOrch,
      ').vow(...)',
    ),
    6: group('Nested 2 errors under Error#1'),
    7: error('Error#2:', 'should be seen'),
    8: consStack(8),
    9: error('Error#2 ERROR_NOTE:', 'from guest error', '(Error#4)'),
    [recLen17 - 7]: group('Nested error under Error#2'),
    [recLen17 - 6]: error('Error#4:', 'should be seen'),
    [recLen17 - 5]: consStack(recLen17 - 5),
    [recLen17 - 4]: cons('groupEnd'),
    [recLen17 - 3]: error('Error#3:', 'this stack'),
    [recLen17 - 2]: consStack(recLen17 - 2),
    [recLen17 - 1]: cons('groupEnd'),
  };

  // XXX: These "Sent as" messages when storing errors in the liveslots
  // durable object state are noisy and spurious.
  for (let i = 0; i < recLen17; i += 1) {
    if (expectedRecording[i] === undefined) {
      expectedRecording[i] = consSentAs(i);
    }
  }
  t.like(recording, expectedRecording);
  t.is(Object.keys(indexToStackRegex).length, 0, 'all stack entries tested');
};

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
      reject(x) {
        const { state } = this;
        state.resolver.reject(x);
      },
    },
  );

/** @typedef {ReturnType<ReturnType<prepareOrchestra>>} Orchestra */

/**
 * @param {ExecutionContext<unknown>} t
 * @param {Zone} zone
 */
const testRejectionPlay = async (t, zone) => {
  t.log('rejectionPlay started');
  const vowTools = prepareVowTools(zone);
  const { asyncFlow, adminAsyncFlow } = prepareTestAsyncFlowTools(t, zone, {
    vowTools,
  });
  const makeOrchestra = prepareOrchestra(zone);
  const { makeVowKit } = vowTools;

  const { vow: v2, resolver: r2 } = zone.makeOnce('v2', () => makeVowKit());
  const hOrch7 = zone.makeOnce('hOrch7', () => makeOrchestra(7, v2, r2));

  // purposely violate rule that guestMethod is closed.
  const { promise: promiseStep, resolve: resolveStep } = makePromiseKit();

  const { guestMethod } = {
    async guestMethod(gOrch7) {
      const p2 = gOrch7.vow();

      await eventLoopIteration();

      const caughtP = p2.catch(e => {
        try {
          // Capture stack details to the console.
          consoleRecorder.go();
          console.error('p2 rejection:', e);
        } finally {
          rejectionRecordingAssertions(t, hOrch7, e, consoleRecorder.stop());
        }
      });

      setImmediate(() => {
        gOrch7.reject(Error('should be seen'));
      });

      await eventLoopIteration();
      resolveStep(caughtP);
      return 'done';
    },
  };

  const wrapperFunc = asyncFlow(zone, 'AsyncFlow1', guestMethod);

  const outcomeV = zone.makeOnce('outcomeV', () => wrapperFunc(hOrch7));

  t.true(isVow(outcomeV));

  const flow = zone.makeOnce('flow', () =>
    adminAsyncFlow.getFlowForOutcomeVow(outcomeV),
  );
  t.is(passStyleOf(flow), 'remotable');

  await promiseStep;
  t.is(await vowTools.when(outcomeV), 'done');

  const logDump = flow.dump();
  t.is(logDump.length, 0);
  t.log('rejectionPlay done');
};

test.serial('test host vow rejection logging', async t => {
  annihilate();
  const zone1 = makeDurableZone(getBaggage(), 'durableRoot');
  await testRejectionPlay(t, zone1);
});
