// @ts-check
import test from 'ava';

import { makeWorkPool } from '../src/work-pool.js';
import { arrayIsLike } from '../tools/ava-assertions.js';

const delay = async ms => new Promise(resolve => setTimeout(resolve, ms, ms));

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
