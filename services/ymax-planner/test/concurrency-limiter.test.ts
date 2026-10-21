import test from 'ava';
import { makePromiseKit } from '@endo/promise-kit';
import {
  makeConcurrencyLimiter,
  makeKeyedConcurrencyLimiter,
} from '../src/concurrency-limiter.ts';

const capacity = 6;

test('makeConcurrencyLimiter bounds concurrent tasks', async t => {
  const runLimited = makeConcurrencyLimiter(capacity);
  const { promise: releaseP, resolve: release } = makePromiseKit<void>();
  let active = 0;
  let maxActive = 0;
  let started = 0;

  const tasks = Array.from({ length: capacity + 1 }, () =>
    runLimited(async () => {
      active += 1;
      started += 1;
      maxActive = Math.max(maxActive, active);
      await releaseP;
      active -= 1;
    }),
  );

  await new Promise(resolve => setImmediate(resolve));
  t.is(started, capacity);
  t.is(maxActive, capacity);

  release();
  await Promise.all(tasks);
  t.is(started, capacity + 1);
  t.is(active, 0);
});

test('makeConcurrencyLimiter releases a permit after rejection', async t => {
  const runLimited = makeConcurrencyLimiter(1);
  const err = Error('failed task');

  await t.throwsAsync(
    runLimited(async () => {
      throw err;
    }),
    { is: err },
  );
  await t.notThrowsAsync(runLimited(async () => undefined));
});

test('makeKeyedConcurrencyLimiter has independent endpoint limits', async t => {
  const runLimited = makeKeyedConcurrencyLimiter(1);
  const endpointA = {};
  const endpointB = {};
  const { promise: releaseP, resolve: release } = makePromiseKit<void>();
  const started: string[] = [];

  const tasks = [
    runLimited(endpointA, async () => {
      started.push('a1');
      await releaseP;
    }),
    runLimited(endpointA, async () => {
      started.push('a2');
      await releaseP;
    }),
    runLimited(endpointB, async () => {
      started.push('b1');
      await releaseP;
    }),
  ];

  await new Promise(resolve => setImmediate(resolve));
  t.deepEqual(started.sort(), ['a1', 'b1']);

  release();
  await Promise.all(tasks);
  t.deepEqual(started.sort(), ['a1', 'a2', 'b1']);
});
