import test from 'ava';

import {
  submitWithRetry,
  type SubmitWithRetryOpts,
} from '../src/retry-settlement.ts';

const TEST_ERROR_CODE = 'TEST_ERROR';

const failure = Error('fail');

const makeHarness = () => {
  const logs: unknown[][] = [];
  const sleeps: number[] = [];
  let nowMs = 1_000_000;
  const log = (...args: unknown[]) => logs.push(args);
  const setTimeout = ((fn: () => void, ms: number) => {
    sleeps.push(ms);
    nowMs += ms;
    queueMicrotask(fn);
    return 0 as unknown as NodeJS.Timeout;
  }) as typeof globalThis.setTimeout;
  const now = () => nowMs;
  return { logs, sleeps, log, setTimeout, now };
};

const baseOpts = (h: ReturnType<typeof makeHarness>): SubmitWithRetryOpts => ({
  log: h.log,
  setTimeout: h.setTimeout,
  now: h.now,
  errorCode: TEST_ERROR_CODE,
});

type TestSubmitWithRetryArgs = {
  label: string;
  makeOptions?: (optsBase: SubmitWithRetryOpts) => SubmitWithRetryOpts;
  callback: (attempt: number) => unknown;
  expectCalls: number;
  expectResult: unknown;
  expectSleeps: number[];
  expectLogs: unknown[][];
};

const testSubmitWithRetry = (
  testLabel: string,
  {
    label,
    makeOptions,
    callback,
    expectCalls,
    expectResult,
    expectSleeps,
    expectLogs,
  }: TestSubmitWithRetryArgs,
) =>
  test(testLabel, async t => {
    const h = makeHarness();
    const opts = makeOptions ? makeOptions(baseOpts(h)) : baseOpts(h);
    let calls = 0;
    const thunk = async () => {
      calls += 1;
      return callback(calls);
    };
    const result = await submitWithRetry(label, thunk, opts);
    t.is(result, expectResult, 'result');
    t.is(calls, expectCalls, 'calls');
    t.deepEqual(h.sleeps, expectSleeps, 'sleeps');
    t.deepEqual(h.logs, expectLogs, 'logs');
  });

testSubmitWithRetry('returns immediately on first-try success', {
  label: '[tx1] settlement',
  callback: () => 'ok',
  expectCalls: 1,
  expectResult: 'ok',
  expectSleeps: [],
  expectLogs: [],
});

testSubmitWithRetry('retries with exponential backoff until success', {
  label: '[tx2] settlement',
  callback: calls => {
    if (calls < 4) throw failure;
    return 'settled';
  },
  expectCalls: 4,
  expectResult: 'settled',
  expectSleeps: [5_000, 10_000, 20_000],
  expectLogs: [
    [
      `[${TEST_ERROR_CODE}] [tx2] settlement attempt 1 failed after 0ms, retrying in 5000ms`,
      failure,
    ],
    [
      '[tx2] settlement attempt 2 failed after 5000ms, retrying in 10000ms',
      failure,
    ],
    [
      '[tx2] settlement attempt 3 failed after 15000ms, retrying in 20000ms',
      failure,
    ],
    ['[tx2] settlement succeeded after 4 attempts'],
  ],
});

testSubmitWithRetry(
  'first failure logs with errorCode; subsequent failures log unprefixed until alert interval',
  {
    label: '[tx3] settlement',
    makeOptions: opts => ({
      ...opts,
      policy: { initialDelayMs: 100, maxDelayMs: 100, alertIntervalMs: 10_000 },
    }),
    callback: calls => {
      if (calls < 4) throw failure;
      return 'ok';
    },
    expectCalls: 4,
    expectResult: 'ok',
    expectSleeps: [100, 100, 100],
    expectLogs: [
      [
        `[${TEST_ERROR_CODE}] [tx3] settlement attempt 1 failed after 0ms, retrying in 100ms`,
        failure,
      ],
      [
        '[tx3] settlement attempt 2 failed after 100ms, retrying in 100ms',
        failure,
      ],
      [
        '[tx3] settlement attempt 3 failed after 200ms, retrying in 100ms',
        failure,
      ],
      ['[tx3] settlement succeeded after 4 attempts'],
    ],
  },
);

{
  const label = '[tx3b] settlement';
  const policy = { initialDelayMs: 100, maxDelayMs: 100, alertIntervalMs: 250 };
  const makeExpectedLog = (
    attempt: number,
    elapsedMs: number,
    errLevel?: 'quiet' | 'noisy',
  ) => {
    if (!errLevel) return [`${label} succeeded after ${attempt} attempts`];
    const baseMsg = `${label} attempt ${attempt} failed after ${elapsedMs}ms, retrying in ${policy.maxDelayMs}ms`;
    return [
      errLevel === 'noisy' ? `[${TEST_ERROR_CODE}] ${baseMsg}` : baseMsg,
      failure,
    ];
  };
  testSubmitWithRetry('alerts re-fire once alert interval elapses', {
    label,
    makeOptions: opts => ({ ...opts, policy }),
    callback: calls => {
      if (calls <= 7) throw failure;
      return 'ok';
    },
    expectCalls: 8,
    expectResult: 'ok',
    expectSleeps: Array(7).fill(100),
    expectLogs: [
      makeExpectedLog(1, 0, 'noisy'),
      makeExpectedLog(2, 100, 'quiet'),
      makeExpectedLog(3, 200, 'quiet'),
      makeExpectedLog(4, 300, 'noisy'),
      makeExpectedLog(5, 400, 'quiet'),
      makeExpectedLog(6, 500, 'quiet'),
      makeExpectedLog(7, 600, 'noisy'),
      makeExpectedLog(8, 700),
    ],
  });
}

testSubmitWithRetry('caps backoff at maxDelayMs', {
  label: '[tx4] settlement',
  callback: calls => {
    if (calls < 8) throw failure;
    return 'done';
  },
  expectCalls: 8,
  expectResult: 'done',
  expectSleeps: [5_000, 10_000, 20_000, 40_000, 60_000, 60_000, 60_000],
  expectLogs: [
    [
      `[${TEST_ERROR_CODE}] [tx4] settlement attempt 1 failed after 0ms, retrying in 5000ms`,
      failure,
    ],
    [
      '[tx4] settlement attempt 2 failed after 5000ms, retrying in 10000ms',
      failure,
    ],
    [
      '[tx4] settlement attempt 3 failed after 15000ms, retrying in 20000ms',
      failure,
    ],
    [
      '[tx4] settlement attempt 4 failed after 35000ms, retrying in 40000ms',
      failure,
    ],
    [
      '[tx4] settlement attempt 5 failed after 75000ms, retrying in 60000ms',
      failure,
    ],
    [
      '[tx4] settlement attempt 6 failed after 135000ms, retrying in 60000ms',
      failure,
    ],
    [
      '[tx4] settlement attempt 7 failed after 195000ms, retrying in 60000ms',
      failure,
    ],
    ['[tx4] settlement succeeded after 8 attempts'],
  ],
});

test('aborts before first attempt when signal already aborted', async t => {
  const h = makeHarness();
  const ctrl = new AbortController();
  ctrl.abort();
  let calls = 0;
  const result = await submitWithRetry(
    '[tx5] settlement',
    async () => {
      calls += 1;
      return 'ok';
    },
    { ...baseOpts(h), signal: ctrl.signal },
  );
  t.is(result, undefined);
  t.is(calls, 0);
  t.deepEqual(h.sleeps, []);
  t.deepEqual(h.logs, [['[tx5] settlement aborted before attempt 1']]);
});

test('aborts during retry sleep', async t => {
  const ctrl = new AbortController();
  const h = makeHarness();
  const sleeps: number[] = [];
  const setTimeoutAbortOnFirst = ((_fn: () => void, ms: number) => {
    sleeps.push(ms);
    queueMicrotask(() => ctrl.abort());
    return 0 as unknown as NodeJS.Timeout;
  }) as typeof globalThis.setTimeout;
  let calls = 0;
  const result = await submitWithRetry(
    '[tx6] settlement',
    async () => {
      calls += 1;
      throw failure;
    },
    {
      ...baseOpts(h),
      setTimeout: setTimeoutAbortOnFirst,
      signal: ctrl.signal,
    },
  );
  t.is(result, undefined);
  t.is(calls, 1);
  t.deepEqual(sleeps, [5_000]);
  t.deepEqual(h.logs, [
    [
      `[${TEST_ERROR_CODE}] [tx6] settlement attempt 1 failed after 0ms, retrying in 5000ms`,
      failure,
    ],
    ['[tx6] settlement aborted before attempt 2'],
  ]);
});
