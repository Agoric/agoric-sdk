// @ts-check
import test from 'ava';

import { Fail } from '@endo/errors';
import { Far } from '@endo/pass-style';
import { makeHeapZone } from '@agoric/base-zone/heap.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';

import { prepareVowKit } from '../src/vow.js';
import { isVow } from '../src/vow-utils.js';
import { prepareRetryableTools } from '../src/retryable.js';
import { makeWhen } from '../src/when.js';

/**
 * @import {IsRetryableReason} from '../src/types.js'
 */

/**
 * @param {object} [options]
 * @param {IsRetryableReason} [options.isRetryableReason]
 */
const makeTestTools = ({ isRetryableReason = () => false } = {}) => {
  const zone = makeHeapZone();
  const makeVowKit = prepareVowKit(zone);
  const when = makeWhen(isRetryableReason);

  const { retryable, adminRetryableFlow } = prepareRetryableTools(zone, {
    makeVowKit,
    isRetryableReason,
  });

  return { zone, when, makeVowKit, retryable, adminRetryableFlow };
};

test('successful flow', async t => {
  const { zone, when, retryable } = makeTestTools();

  const succeed = retryable(zone, 'succeed', async () => 42);

  const resultV = succeed();
  const result = await when(resultV);
  t.is(result, 42, 'expected result');
});

test('rejected flow', async t => {
  const { zone, when, retryable } = makeTestTools();

  const reject = retryable(zone, 'reject', async () => Fail`some error`);

  const resultV = reject();
  const resultP = when(resultV);
  await t.throwsAsync(resultP, { message: 'some error' }, 'expected rejection');
});

test('throwing flow', async t => {
  const { zone, when, retryable } = makeTestTools();

  const error = retryable(zone, 'error', () => Fail`some error`);

  const resultV = error();
  const resultP = when(resultV);
  await t.throwsAsync(resultP, { message: 'some error' }, 'expected rejection');
});

test('passable arguments', async t => {
  const { zone, when, makeVowKit, retryable } = makeTestTools();

  const argValue = {
    remotable: Far('test'),
    promise: Promise.resolve(),
    vowKit: makeVowKit(),
  };

  const passthrough = retryable(zone, 'passthrough', async arg => arg);

  const resultV = passthrough(argValue);
  const result = await when(resultV);
  t.deepEqual(result, argValue, 'expected result');
});

test('non-passable arguments', async t => {
  const { zone, when, retryable } = makeTestTools();

  const passthrough = retryable(zone, 'passthrough', async arg => arg);

  const nonPassableArg = harden({
    foo() {
      return 'bar';
    },
  });

  t.false(zone.isStorable(nonPassableArg), 'arg is actually non passable');

  let resultV;
  t.notThrows(() => {
    resultV = passthrough(nonPassableArg);
  }, 'retryable does not synchronously error');

  const resultP = when(resultV);
  await t.throwsAsync(
    resultP,
    { message: /^retryable arguments must be storable/ },
    'expected rejection',
  );
});

test('outcome vow', async t => {
  const { zone, when, retryable, adminRetryableFlow } = makeTestTools();

  const succeed = retryable(zone, 'succeed', async () => 42);

  const resultV = succeed();

  t.true(isVow(resultV), 'retryable result is vow');

  const flow = adminRetryableFlow.getFlowForOutcomeVow(resultV);
  t.truthy(flow, 'flow from outcome vow');

  t.is(flow.getOutcome(), resultV, 'outcome vow match');

  const result = await when(resultV);
  t.is(result, 42, 'expected result');

  t.throws(
    () => adminRetryableFlow.getFlowForOutcomeVow(resultV),
    undefined,
    'outcome vow not found',
  );
});

test('retry', async t => {
  const { zone, when, retryable } = makeTestTools({
    isRetryableReason: (reason, priorReason) =>
      reason !== priorReason && reason.startsWith('retry') && reason,
  });

  const expectedCalls = 3;

  let getResultCalled = 0;
  const resultProvider = Far('ResultProvider', {
    getResult() {
      if (getResultCalled < expectedCalls) {
        getResultCalled += 1;
      }
      // eslint-disable-next-line prefer-promise-reject-errors
      return Promise.reject(`retry-${getResultCalled}`);
    },
  });

  const resultFromProvider = retryable(
    zone,
    'resultFromProvider',
    async provider => provider.getResult(),
  );

  const resultV = resultFromProvider(resultProvider);

  const result = await when(resultV).catch(r => r);
  t.is(
    result,
    `retry-${expectedCalls}`,
    'expected getResult called multiple times',
  );
});

test('restart', async t => {
  const { zone, when, retryable, adminRetryableFlow } = makeTestTools();

  let runNum = 0;
  const restarted = retryable(zone, 'testRestartedRetryable', async () => {
    // Non idempotent function to simplify the test
    runNum += 1;
    const currentRun = runNum;
    await eventLoopIteration();
    if (currentRun < 3) {
      // Trigger our own invocation restart
      // eslint-disable-next-line no-use-before-define
      flow.restart();
    }
    if (currentRun === 2) {
      throw Error('reject');
    }
    return currentRun;
  });

  const resultV = restarted();
  const flow = adminRetryableFlow.getFlowForOutcomeVow(resultV);
  t.truthy(flow, 'flow from outcome vow');

  const result = await when(resultV);
  t.is(result, 3, 'flow result from restart');

  t.throws(() => flow.restart(), {
    message: /^Cannot restart a done retryable flow/,
  });
});
