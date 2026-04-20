import test from 'ava';

import { submitWithRetry } from '../src/retry-settlement.ts';

const TEST_ERROR_CODE = 'TEST_ERROR';

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

const baseOpts = (h: ReturnType<typeof makeHarness>) => ({
  log: h.log,
  setTimeout: h.setTimeout,
  now: h.now,
  errorCode: TEST_ERROR_CODE,
});

test('returns immediately on first-try success', async t => {
  const h = makeHarness();
  const result = await submitWithRetry(
    '[tx1] settlement',
    async () => 'ok',
    baseOpts(h),
  );
  t.is(result, 'ok');
  t.deepEqual(h.sleeps, []);
  t.deepEqual(h.logs, []);
});

test('retries with exponential backoff until success', async t => {
  const h = makeHarness();
  let calls = 0;
  const result = await submitWithRetry(
    '[tx2] settlement',
    async () => {
      calls += 1;
      if (calls < 4) throw Error(`boom ${calls}`);
      return 'settled';
    },
    baseOpts(h),
  );
  t.is(result, 'settled');
  t.is(calls, 4);
  t.deepEqual(h.sleeps, [5_000, 10_000, 20_000]);
  t.true(h.logs.some(args => String(args[0]).includes('succeeded after 4')));
});

test('first failure logs with errorCode; subsequent failures log unprefixed until alert interval', async t => {
  const h = makeHarness();
  let calls = 0;
  await submitWithRetry(
    '[tx3] settlement',
    async () => {
      calls += 1;
      if (calls < 4) throw Error('fail');
      return 'ok';
    },
    {
      ...baseOpts(h),
      policy: { initialDelayMs: 100, maxDelayMs: 100, alertIntervalMs: 10_000 },
    },
  );
  const taggedLogs = h.logs.filter(args =>
    String(args[0]).includes(`[${TEST_ERROR_CODE}]`),
  );
  // Only the first failure alerts (subsequent attempts are within the 10s
  // interval with 100ms between each).
  t.is(taggedLogs.length, 1);
});

test('alerts re-fire once alert interval elapses', async t => {
  const h = makeHarness();
  let calls = 0;
  await submitWithRetry(
    '[tx3b] settlement',
    async () => {
      calls += 1;
      if (calls <= 20) throw Error('fail');
      return 'ok';
    },
    {
      ...baseOpts(h),
      policy: { initialDelayMs: 100, maxDelayMs: 100, alertIntervalMs: 250 },
    },
  );
  const taggedLogs = h.logs.filter(args =>
    String(args[0]).includes(`[${TEST_ERROR_CODE}]`),
  );
  t.true(taggedLogs.length >= 5);
});

test('caps backoff at maxDelayMs', async t => {
  const h = makeHarness();
  let calls = 0;
  await submitWithRetry(
    '[tx4] settlement',
    async () => {
      calls += 1;
      if (calls < 8) throw Error('stuck');
      return 'done';
    },
    baseOpts(h),
  );
  t.deepEqual(
    h.sleeps,
    [5_000, 10_000, 20_000, 40_000, 60_000, 60_000, 60_000],
  );
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
  t.true(h.logs.some(args => String(args[0]).includes('aborted')));
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
      throw Error('fail');
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
});
