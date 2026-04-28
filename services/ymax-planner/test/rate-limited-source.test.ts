import test from 'ava';

import rateLimitedSource from '../src/rate-limited-source.ts';

const makeFakeClock = () => {
  let clockNow = 0;

  return {
    advance: (ms: number) => {
      clockNow += ms;
    },
    setTimeout: ((cb: () => void, ms?: number) => {
      clockNow += ms ?? 0;
      cb();
      return 0;
    }) as typeof globalThis.setTimeout,
    now: () => clockNow,
  };
};

test('rateLimitedSource: bursts up to quota, then waits one window', async t => {
  const clock = makeFakeClock();
  const items = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const releases: Array<{ item: number; at: number }> = [];
  for await (const item of rateLimitedSource({
    source: items,
    policy: { quota: 3, windowMs: 100 },
    powers: clock,
  })) {
    releases.push({ item, at: clock.now() });
  }
  t.deepEqual(releases, [
    { item: 0, at: 0 },
    { item: 1, at: 0 },
    { item: 2, at: 0 },
    { item: 3, at: 100 },
    { item: 4, at: 100 },
    { item: 5, at: 100 },
    { item: 6, at: 200 },
    { item: 7, at: 200 },
    { item: 8, at: 200 },
  ]);
});

test('rateLimitedSource: an idle period grants the next item without delay', async t => {
  const clock = makeFakeClock();
  let setTimeoutCalls = 0;
  const powers = {
    now: clock.now,
    setTimeout: ((cb: () => void, ms?: number) => {
      setTimeoutCalls += 1;
      return clock.setTimeout(cb, ms);
    }) as typeof globalThis.setTimeout,
  };
  const iter = rateLimitedSource({
    source: [0, 1, 2],
    policy: { quota: 1, windowMs: 100 },
    powers,
  });

  t.is((await iter.next()).value, 0);
  t.is(clock.now(), 0);
  t.is(setTimeoutCalls, 0);

  clock.advance(150);
  t.is((await iter.next()).value, 1);
  t.is(clock.now(), 150);
  t.is(setTimeoutCalls, 0);

  t.is((await iter.next()).value, 2);
  t.is(clock.now(), 250);
  t.is(setTimeoutCalls, 1);
});

test('rateLimitedSource: sliding window spaces by oldest in-window release', async t => {
  const clock = makeFakeClock();
  const iter = rateLimitedSource({
    source: [0, 1, 2, 3],
    policy: { quota: 2, windowMs: 100 },
    powers: clock,
  });

  await iter.next();
  t.is(clock.now(), 0);

  clock.advance(50);
  await iter.next();
  t.is(clock.now(), 50);

  await iter.next();
  t.is(clock.now(), 100);

  await iter.next();
  t.is(clock.now(), 150);
});

test('rateLimitedSource: empty source completes without invoking setTimeout', async t => {
  const clock = makeFakeClock();
  let setTimeoutCalls = 0;
  const powers = {
    now: clock.now,
    setTimeout: ((cb: () => void, ms?: number) => {
      setTimeoutCalls += 1;
      return clock.setTimeout(cb, ms);
    }) as typeof globalThis.setTimeout,
  };
  for await (const _ of rateLimitedSource({
    source: [],
    policy: { quota: 1, windowMs: 100 },
    powers,
  })) {
    t.fail('should not emit');
  }
  t.is(setTimeoutCalls, 0);
  t.is(clock.now(), 0);
});

test('rateLimitedSource: accepts async iterables', async t => {
  const clock = makeFakeClock();
  async function* gen() {
    yield 'a';
    yield 'b';
    yield 'c';
  }
  const releases: Array<{ item: string; at: number }> = [];
  for await (const item of rateLimitedSource({
    source: gen(),
    policy: { quota: 1, windowMs: 100 },
    powers: clock,
  })) {
    releases.push({ item, at: clock.now() });
  }
  t.deepEqual(releases, [
    { item: 'a', at: 0 },
    { item: 'b', at: 100 },
    { item: 'c', at: 200 },
  ]);
});

test('rateLimitedSource: validates quota', t => {
  const clock = makeFakeClock();
  for (const bad of [0, -1, 1.5, NaN, Infinity]) {
    t.throws(
      () =>
        rateLimitedSource({
          source: [],
          policy: { quota: bad, windowMs: 100 },
          powers: clock,
        }),
      { instanceOf: RangeError, message: /quota/ },
      `quota=${bad}`,
    );
  }
});

test('rateLimitedSource: validates windowMs', t => {
  const clock = makeFakeClock();
  for (const bad of [0, -1, NaN, Infinity]) {
    t.throws(
      () =>
        rateLimitedSource({
          source: [],
          policy: { quota: 1, windowMs: bad },
          powers: clock,
        }),
      { instanceOf: RangeError, message: /windowMs/ },
      `windowMs=${bad}`,
    );
  }
});

test('rateLimitedSource: composes with worker pool style consumers', async t => {
  const clock = makeFakeClock();
  const items = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const starts: Array<{ item: number; at: number }> = [];
  for await (const item of rateLimitedSource({
    source: items,
    policy: { quota: 4, windowMs: 60 },
    powers: clock,
  })) {
    starts.push({ item, at: clock.now() });
    clock.advance(80);
  }
  // Quota=4 in 60ms, but each "task" advances 80ms — so the window is always
  // already empty by the time we pull again. Every item starts immediately.
  t.deepEqual(
    starts.map(s => s.at),
    [0, 80, 160, 240, 320, 400, 480, 560, 640, 720, 800, 880],
  );
});
