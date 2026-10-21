import test from 'ava';

import {
  withRetries,
  withRetriesForAlerting,
  type WithRetriesForAlertingOpts,
} from '../src/retries.ts';

const TEST_ALERTING_PREFIX = '[TEST_ERROR]';

const failure = Error('fail');

const makeExpectLog = (label: string) => {
  const expectLog = (
    attempt: number,
    elapsedMs: number,
    nextDelayMs?: number,
    errLevel?: 'quiet' | 'noisy',
  ) => {
    if (nextDelayMs === undefined) {
      return [`${label} succeeded after ${attempt} attempt(s)`];
    }
    const baseMsg = `${label} attempt ${attempt} failed after ${elapsedMs}ms, retrying in ${nextDelayMs}ms`;
    return [
      errLevel === 'noisy' ? `${TEST_ALERTING_PREFIX} ${baseMsg}` : baseMsg,
      failure,
    ];
  };
  return expectLog;
};

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
  expectCallCount: number;
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
    expectCallCount,
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
    t.is(calls, expectCallCount, 'calls');
    t.deepEqual(h.sleeps, expectSleeps, 'sleeps');
    t.deepEqual(h.logs, expectLogs, 'logs');
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

testWithRetriesForAlerting('returns immediately on first-try success', {
  label: '[tx1] settlement',
  callback: () => 'ok',
  expectCallCount: 1,
  expectResult: 'ok',
  expectSleeps: [],
  expectLogs: [],
});

{
  const expectLog = makeExpectLog('[tx2] settlement');
  testWithRetriesForAlerting('retries with exponential backoff until success', {
    label: '[tx2] settlement',
    callback: calls => {
      if (calls < 4) throw failure;
      return 'settled';
    },
    expectCallCount: 4,
    expectResult: 'settled',
    expectSleeps: [5_000, 10_000, 20_000],
    expectLogs: [
      expectLog(1, 0, 5_000, 'noisy'),
      expectLog(2, 5_000, 10_000, 'quiet'),
      expectLog(3, 15_000, 20_000, 'quiet'),
      expectLog(4, 35_000),
    ],
  });
}

{
  const expectLog = makeExpectLog('[tx3] settlement');
  testWithRetriesForAlerting(
    'first failure logs with alertingPrefix; subsequent failures log unprefixed until alert interval',
    {
      label: '[tx3] settlement',
      makeOptions: opts => ({
        ...opts,
        policy: {
          initialDelayMs: 100,
          maxDelayMs: 100,
          alertIntervalMs: 10_000,
        },
      }),
      callback: calls => {
        if (calls < 4) throw failure;
        return 'ok';
      },
      expectCallCount: 4,
      expectResult: 'ok',
      expectSleeps: [100, 100, 100],
      expectLogs: [
        expectLog(1, 0, 100, 'noisy'),
        expectLog(2, 100, 100, 'quiet'),
        expectLog(3, 200, 100, 'quiet'),
        expectLog(4, 300),
      ],
    },
  );
}

{
  const label = '[tx3b] settlement';
  const policy = { initialDelayMs: 100, maxDelayMs: 100, alertIntervalMs: 250 };
  const expectLog = makeExpectLog(label);
  testWithRetriesForAlerting('alerts re-fire once alert interval elapses', {
    label,
    makeOptions: opts => ({ ...opts, policy }),
    callback: calls => {
      if (calls <= 7) throw failure;
      return 'ok';
    },
    expectCallCount: 8,
    expectResult: 'ok',
    expectSleeps: Array(7).fill(100),
    expectLogs: [
      expectLog(1, 0, 100, 'noisy'),
      expectLog(2, 100, 100, 'quiet'),
      expectLog(3, 200, 100, 'quiet'),
      expectLog(4, 300, 100, 'noisy'),
      expectLog(5, 400, 100, 'quiet'),
      expectLog(6, 500, 100, 'quiet'),
      expectLog(7, 600, 100, 'noisy'),
      expectLog(8, 700),
    ],
  });
}

{
  const expectLog = makeExpectLog('[tx4] settlement');
  testWithRetriesForAlerting('caps backoff at maxDelayMs', {
    label: '[tx4] settlement',
    callback: calls => {
      if (calls < 8) throw failure;
      return 'done';
    },
    expectCallCount: 8,
    expectResult: 'done',
    expectSleeps: [5_000, 10_000, 20_000, 40_000, 60_000, 60_000, 60_000],
    expectLogs: [
      expectLog(1, 0, 5_000, 'noisy'),
      expectLog(2, 5_000, 10_000, 'quiet'),
      expectLog(3, 15_000, 20_000, 'quiet'),
      expectLog(4, 35_000, 40_000, 'quiet'),
      expectLog(5, 75_000, 60_000, 'quiet'),
      expectLog(6, 135_000, 60_000, 'quiet'),
      expectLog(7, 195_000, 60_000, 'quiet'),
      expectLog(8, 255_000),
    ],
  });
}

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
