import test from 'ava';

import {
  withRetries,
  withRetriesForAlerting,
  type WithRetriesForAlertingOpts,
} from '../src/retries.ts';

const TEST_ALERTING_PREFIX = '[TEST_ERROR]';

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
  const baseOpts: WithRetriesForAlertingOpts = {
    log,
    setTimeout,
    now,
    alertingPrefix: TEST_ALERTING_PREFIX,
  };
  return { logs, sleeps, log, setTimeout, now, baseOpts };
};

type TestWithRetriesForAlertingArgs = {
  label: string;
  makeOptions?: (
    optsBase: WithRetriesForAlertingOpts,
  ) => WithRetriesForAlertingOpts;
  callback: (attempt: number) => unknown;
  expectCalls: number;
  expectResult: unknown;
  expectSleeps: number[];
  expectLogs: unknown[][];
};

const testWithRetriesForAlerting = (
  testLabel: string,
  {
    label,
    makeOptions,
    callback,
    expectCalls,
    expectResult,
    expectSleeps,
    expectLogs,
  }: TestWithRetriesForAlertingArgs,
) =>
  test(testLabel, async t => {
    const h = makeHarness();
    const opts = makeOptions ? makeOptions(h.baseOpts) : h.baseOpts;
    let calls = 0;
    const thunk = async () => {
      calls += 1;
      return callback(calls);
    };
    const result = await withRetriesForAlerting(label, thunk, opts);
    t.is(result, expectResult, 'result');
    t.is(calls, expectCalls, 'calls');
    t.deepEqual(h.sleeps, expectSleeps, 'sleeps');
    t.deepEqual(h.logs, expectLogs, 'logs');
  });

testWithRetriesForAlerting('returns immediately on first-try success', {
  label: '[tx1] settlement',
  callback: () => 'ok',
  expectCalls: 1,
  expectResult: 'ok',
  expectSleeps: [],
  expectLogs: [],
});

testWithRetriesForAlerting('retries with exponential backoff until success', {
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
      `${TEST_ALERTING_PREFIX} [tx2] settlement attempt 1 failed after 0ms, retrying in 5000ms`,
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
    ['[tx2] settlement succeeded after 4 attempt(s)'],
  ],
});

testWithRetriesForAlerting(
  'first failure logs with alertingPrefix; subsequent failures log unprefixed until alert interval',
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
        `${TEST_ALERTING_PREFIX} [tx3] settlement attempt 1 failed after 0ms, retrying in 100ms`,
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
      ['[tx3] settlement succeeded after 4 attempt(s)'],
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
    if (!errLevel) return [`${label} succeeded after ${attempt} attempt(s)`];
    const baseMsg = `${label} attempt ${attempt} failed after ${elapsedMs}ms, retrying in ${policy.maxDelayMs}ms`;
    return [
      errLevel === 'noisy' ? `${TEST_ALERTING_PREFIX} ${baseMsg}` : baseMsg,
      failure,
    ];
  };
  testWithRetriesForAlerting('alerts re-fire once alert interval elapses', {
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

testWithRetriesForAlerting('caps backoff at maxDelayMs', {
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
      `${TEST_ALERTING_PREFIX} [tx4] settlement attempt 1 failed after 0ms, retrying in 5000ms`,
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
    ['[tx4] settlement succeeded after 8 attempt(s)'],
  ],
});

test('aborts before first attempt when signal already aborted', async t => {
  const h = makeHarness();
  const ctrl = new AbortController();
  ctrl.abort();
  let calls = 0;
  const result = await withRetriesForAlerting(
    '[tx5] settlement',
    async () => {
      calls += 1;
      return 'ok';
    },
    { ...h.baseOpts, signal: ctrl.signal },
  );
  t.is(result, undefined);
  t.is(calls, 0);
  t.deepEqual(h.sleeps, []);
  t.deepEqual(h.logs, [['[tx5] settlement aborted after 0 attempt(s)']]);
});

test('aborts on the next iteration after signal fires during sleep', async t => {
  const ctrl = new AbortController();
  const h = makeHarness();
  const sleeps: number[] = [];
  const setTimeoutAbortFirst = ((fn: () => void, ms: number) => {
    sleeps.push(ms);
    queueMicrotask(() => {
      ctrl.abort();
      fn();
    });
    return 0 as unknown as NodeJS.Timeout;
  }) as typeof globalThis.setTimeout;
  let calls = 0;
  const result = await withRetriesForAlerting(
    '[tx6] settlement',
    async () => {
      calls += 1;
      throw failure;
    },
    {
      ...h.baseOpts,
      setTimeout: setTimeoutAbortFirst,
      signal: ctrl.signal,
    },
  );
  t.is(result, undefined);
  t.is(calls, 1);
  t.deepEqual(sleeps, [5_000]);
  t.deepEqual(h.logs, [
    [
      `${TEST_ALERTING_PREFIX} [tx6] settlement attempt 1 failed after 0ms, retrying in 5000ms`,
      failure,
    ],
    ['[tx6] settlement aborted after 1 attempt(s)'],
  ]);
});

test('logs "aborting" when signal fires during a failing thunk', async t => {
  const ctrl = new AbortController();
  const h = makeHarness();
  let calls = 0;
  const result = await withRetriesForAlerting(
    '[tx7] settlement',
    async () => {
      calls += 1;
      ctrl.abort();
      throw failure;
    },
    { ...h.baseOpts, signal: ctrl.signal },
  );
  t.is(result, undefined);
  t.is(calls, 1);
  t.deepEqual(h.sleeps, []);
  t.deepEqual(h.logs, [
    [
      `${TEST_ALERTING_PREFIX} [tx7] settlement attempt 1 failed after 0ms, aborting`,
      failure,
    ],
  ]);
});

test('withRetries: returns the callback result on first success', async t => {
  const h = makeHarness();
  const seen: number[] = [];
  const result = await withRetries(
    async ({ retryCount }) => {
      seen.push(retryCount);
      return 42;
    },
    { setTimeout: h.setTimeout },
  );
  t.is(result, 42);
  t.deepEqual(seen, [0]);
  t.deepEqual(h.sleeps, []);
});

test('withRetries: exposes retryCount and nextDelayMs to the callback', async t => {
  const h = makeHarness();
  const seen: Array<{ retryCount: number; nextDelayMs: number }> = [];
  const result = await withRetries(
    async args => {
      seen.push(args);
      if (args.retryCount < 3) throw Error('keep going');
      return 'done';
    },
    { setTimeout: h.setTimeout },
  );
  t.is(result, 'done');
  t.deepEqual(seen, [
    { retryCount: 0, nextDelayMs: 5_000 },
    { retryCount: 1, nextDelayMs: 10_000 },
    { retryCount: 2, nextDelayMs: 20_000 },
    { retryCount: 3, nextDelayMs: 40_000 },
  ]);
  t.deepEqual(h.sleeps, [5_000, 10_000, 20_000]);
});

test('withRetries: caps delay at maxDelayMs', async t => {
  const h = makeHarness();
  let calls = 0;
  await withRetries(
    async () => {
      calls += 1;
      if (calls < 6) throw Error('boom');
      return 'ok';
    },
    {
      setTimeout: h.setTimeout,
      policy: { initialDelayMs: 100, maxDelayMs: 300 },
    },
  );
  t.deepEqual(h.sleeps, [100, 200, 300, 300, 300]);
});
