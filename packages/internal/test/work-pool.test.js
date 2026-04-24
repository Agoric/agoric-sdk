// @ts-check
import test from 'ava';

import { makeWorkPool } from '../src/work-pool.js';
import { arrayIsLike } from '../tools/ava-assertions.js';

/**
 * @param {number} ms
 * @returns {Promise<number>}
 */
const delay = ms => new Promise(resolve => setTimeout(resolve, ms, ms));

test('makeWorkPool', async t => {
  const delays = [100, 20, 20, 80, 1];
  const capacity = 2;
  const expect = [
    { idx: 0, take: 100 },
    { idx: 1, take: 20 },
    { idx: 1, fulfill: 20 },
    { idx: 2, take: 20 },
    { idx: 2, fulfill: 20 },
    { idx: 3, take: 80 },
    { idx: 0, fulfill: 100 },
    { idx: 4, take: 1 },
    { idx: 4, fulfill: 1 },
    { idx: 3, fulfill: 80 },
  ];

  const log = [];
  const workPool = makeWorkPool(delays, capacity, async (ms, idx) => {
    log.push({ idx, take: ms });
    await delay(ms);
    log.push({ idx, fulfill: ms });
    return ms;
  });
  await t.throwsAsync(workPool, { message: /not thenable/ });
  await workPool.done;
  arrayIsLike(t, log, expect);

  const results = [];
  for await (const [result, idx] of workPool) {
    results.push({ idx, fulfill: result });
  }
  arrayIsLike(
    t,
    results,
    expect.filter(rec => rec.fulfill),
  );
});

test('makeWorkPool errors', async t => {
  const delays = [100, 20, 20, 80, -1];
  const capacity = 2;
  const expect = [
    { idx: 0, take: 100 },
    { idx: 1, take: 20 },
    { idx: 1, fulfill: 20 },
    { idx: 2, take: 20 },
    { idx: 2, fulfill: 20 },
    { idx: 3, take: 80 },
    { idx: 0, fulfill: 100 },
    { idx: 4, take: -1 },
    { idx: 4, reject: 'invalid ms: -1' },
  ];

  const log = [];
  const workPool = makeWorkPool(delays, capacity, async (ms, idx) => {
    log.push({ idx, take: ms });
    if (ms < 0) {
      const msg = `invalid ms: ${ms}`;
      log.push({ idx, reject: msg });
      throw Error(msg);
    }
    await delay(ms);
    log.push({ idx, fulfill: ms });
    return ms;
  });
  await t.throwsAsync(workPool.done, { message: 'invalid ms: -1' });
  const truncatedLog = log.reduce((arr, rec) => {
    if (!arr.at(-1)?.reject) arr.push(rec);
    return arr;
  }, []);
  arrayIsLike(t, truncatedLog, expect);

  const results = [];
  await t.throwsAsync(
    async () => {
      for await (const [result, idx] of workPool) {
        results.push({ idx, fulfill: result });
      }
    },
    { message: 'invalid ms: -1' },
  );
  arrayIsLike(
    t,
    results,
    expect.filter(rec => rec.fulfill),
  );
});

/**
 * Record the start time of every processInput invocation relative to the
 * pool's construction and the item's index. Tasks otherwise settle instantly,
 * so timings reflect the rate limiter only.
 */
/**
 *
 * @param {Array<number>} items
 * @param {{
 *  capacity?: number;
 *  mode?: 'all' | 'allSettled';
 *  rate?: {
 *    intervalMs: number;
 *    limit: number
 *  }
 * }} config
 * @returns {Promise<Array<{
 *  at: number;
 *  index: number;
 *  item: number
 * }>>}
 */
const runRateProbe = async (items, config) => {
  const starts = [];
  const t0 = Date.now();
  const pool = makeWorkPool(items, config, async (item, index) => {
    starts.push({ at: Date.now() - t0, index, item });
  });
  await pool.done;
  return starts;
};

const assertNear = (t, actual, expected, label, slackMs = 60) => {
  t.true(
    actual >= expected - 5,
    `${label}: ${actual}ms should be >= ${expected - 5}ms`,
  );
  t.true(
    actual <= expected + slackMs,
    `${label}: ${actual}ms should be <= ${expected + slackMs}ms`,
  );
};

test('makeWorkPool rate: burst then sliding window', async t => {
  // 9 instant tasks with limit=3 per 100ms window: 3 bursts at 0, 100, 200ms.
  const limit = 3;
  const intervalMs = 100;
  const items = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const starts = await runRateProbe(items, {
    capacity: 100,
    rate: { limit, intervalMs },
  });

  t.is(starts.length, items.length);
  starts.sort((a, b) => a.index - b.index);
  for (let i = 0; i < items.length; i += 1) {
    t.is(starts[i].index, i);
    const window = Math.floor(i / limit);
    assertNear(t, starts[i].at, window * intervalMs, `start[${i}]`);
  }
});

test('makeWorkPool rate: capacity dominates when tighter than rate', async t => {
  // Each task takes 50ms; capacity=2 caps concurrency at 2; rate is generous.
  const capacity = 2;
  const items = [0, 1, 2, 3, 4, 5];
  const starts = [];
  const t0 = Date.now();
  const pool = makeWorkPool(
    items,
    { capacity, rate: { intervalMs: 10, limit: 100 } },
    async (_, index) => {
      starts.push({ index, at: Date.now() - t0 });
      await delay(50);
    },
  );
  await pool.done;
  starts.sort((a, b) => a.index - b.index);

  // Items 0,1 start immediately; 2,3 at ~50ms; 4,5 at ~100ms.
  for (let i = 0; i < items.length; i += 1) {
    const expected = Math.floor(i / capacity) * 50;
    assertNear(t, starts[i].at, expected, `start[${i}]`);
  }
});

test('makeWorkPool rate: rate dominates when tighter than capacity', async t => {
  // capacity is generous but rate limit=2 per 100ms serializes the start times.
  const items = [0, 1, 2, 3, 4, 5];
  const starts = await runRateProbe(items, {
    capacity: 100,
    rate: { limit: 2, intervalMs: 100 },
  });
  starts.sort((a, b) => a.index - b.index);

  // 0,1 at ~0ms; 2,3 at ~100ms; 4,5 at ~200ms.
  for (let i = 0; i < items.length; i += 1) {
    const expected = Math.floor(i / 2) * 100;
    assertNear(t, starts[i].at, expected, `start[${i}]`);
  }
});

test('makeWorkPool rate: rejected tasks still consume slots', async t => {
  // With limit=2/100ms, a rejected task at index 1 must still count against
  // the rate window so index 2 (and 3) wait until ~100ms.
  const items = [0, 1, 2, 3];
  const starts = [];
  const t0 = Date.now();
  const pool = makeWorkPool(
    items,
    { capacity: 100, mode: 'allSettled', rate: { limit: 2, intervalMs: 100 } },
    async (item, index) => {
      starts.push({ index, at: Date.now() - t0 });
      if (index === 1) throw Error('No op');
      return item;
    },
  );
  await pool.done;
  starts.sort((a, b) => a.index - b.index);

  assertNear(t, starts[0].at, 0, 'start[0]');
  assertNear(t, starts[1].at, 0, 'start[1] (rejects)');
  assertNear(t, starts[2].at, 100, 'start[2]');
  assertNear(t, starts[3].at, 100, 'start[3]');
});

test('makeWorkPool rate: large burst then throttled tail', async t => {
  // Each task takes ~80ms, so capacity (10) initially dominates:
  // 6 start at t=0 and 4 wait for a rate slot at t=60ms. After
  // tasks 0-5 finish at t~80ms, slots 10-11
  // become available immediately (startTimes[0]=0 is outside the window by
  // t=80), and so on.
  const items = Array.from({ length: 14 }, (_, i) => i);
  const capacity = 10;
  const rate = { limit: 6, intervalMs: 60 };
  const taskMs = 80;

  const starts = [];
  const ends = [];
  const t0 = Date.now();
  const pool = makeWorkPool(items, { capacity, rate }, async (_, index) => {
    starts.push({ index, at: Date.now() - t0 });
    await delay(taskMs);
    ends.push({ index, at: Date.now() - t0 });
  });
  await pool.done;

  t.is(starts.length, items.length);
  starts.sort((a, b) => a.index - b.index);

  // First 6: immediate burst (capacity allows, rate allows).
  for (let i = 0; i < 6; i += 1)
    assertNear(t, starts[i].at, 0, `start[${i}] (initial burst)`);

  // Next 4 (indices 6..9): capped by the rate limiter — the 6-deep window
  // forces them to wait until the first batch ages out at t=60.
  for (let i = 6; i < 10; i += 1)
    assertNear(t, starts[i].at, 60, `start[${i}] (rate-gated)`);

  // Remaining 4 (10..13) can't be pulled until capacity frees up at t~80.
  // They're rate-eligible then (startTimes[0]=0 is outside the 60ms window).
  for (let i = 10; i < 14; i += 1)
    assertNear(t, starts[i].at, 80, `start[${i}] (capacity-gated)`, 80);
});

test('makeWorkPool rate: validates config', t => {
  const items = [0];
  const noop = async () => {};
  t.throws(
    () => makeWorkPool(items, { rate: { limit: 0, intervalMs: 10 } }, noop),
    { instanceOf: RangeError, message: /rate\.limit/ },
  );
  t.throws(
    () => makeWorkPool(items, { rate: { limit: 1.5, intervalMs: 10 } }, noop),
    { instanceOf: RangeError, message: /rate\.limit/ },
  );
  t.throws(
    () =>
      makeWorkPool(items, { rate: { limit: 1, intervalMs: Infinity } }, noop),
    { instanceOf: RangeError, message: /rate\.intervalMs/ },
  );
  t.throws(
    () => makeWorkPool(items, { rate: { limit: 1, intervalMs: 0 } }, noop),
    { instanceOf: RangeError, message: /rate\.intervalMs/ },
  );
});

test('makeWorkPool rate: undefined is a no-op (baseline)', async t => {
  const items = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const starts = await runRateProbe(items, { capacity: 100 });
  for (const s of starts) assertNear(t, s.at, 0, `start[${s.index}]`, 40);
});

test('makeWorkPool mode "allSettled"', async t => {
  const delays = [100, 20, 20, 80, -1];
  const capacity = 2;
  const expect = [
    { idx: 0, take: 100 },
    { idx: 1, take: 20 },
    { idx: 1, fulfill: 20 },
    { idx: 2, take: 20 },
    { idx: 2, fulfill: 20 },
    { idx: 3, take: 80 },
    { idx: 0, fulfill: 100 },
    { idx: 4, take: -1 },
    { idx: 4, reject: 'invalid ms: -1' },
    { idx: 3, fulfill: 80 },
  ];

  const log = [];
  const config = /** @type {const} */ ({ capacity, mode: 'allSettled' });
  const workPool = makeWorkPool(delays, config, async (ms, idx) => {
    log.push({ idx, take: ms });
    if (ms < 0) {
      const msg = `invalid ms: ${ms}`;
      log.push({ idx, reject: msg });
      throw Error(msg);
    }
    await delay(ms);
    log.push({ idx, fulfill: ms });
    return ms;
  });
  await workPool.done;
  const truncatedLog = log.reduce((arr, rec) => {
    if (!arr.at(-1)?.reject) arr.push(rec);
    return arr;
  }, []);
  arrayIsLike(t, truncatedLog, expect.slice(0, -1));

  const results = [];
  for await (const [result, idx] of workPool) {
    if (result.status === 'rejected') {
      results.push({ idx, reject: result.reason.message });
    } else {
      results.push({ idx, fulfill: result.value });
    }
  }
  arrayIsLike(
    t,
    results,
    expect.filter(rec => rec.fulfill || rec.reject),
  );
});
