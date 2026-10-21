import type { ExecutionContext } from 'ava';

type TimingSample = {
  count: number;
  totalMs: number;
  maxMs: number;
};

const enabled = process.env.PORTFOLIO_TEST_TIMING === '1';

const round = (ms: number) => Math.round(ms * 100) / 100;

const stores = new WeakMap<ExecutionContext, Map<string, TimingSample>>();

const getStore = (t: ExecutionContext) => {
  const stash = stores.get(t);
  if (stash) {
    return stash;
  }

  const store = new Map<string, TimingSample>();
  stores.set(t, store);

  t.teardown(() => {
    if (store.size === 0) {
      return;
    }
    const summary = [...store.entries()]
      .sort(([, a], [, b]) => b.totalMs - a.totalMs)
      .map(
        ([label, sample]) =>
          `${label}: total=${round(sample.totalMs)}ms count=${sample.count} avg=${round(sample.totalMs / sample.count)}ms max=${round(sample.maxMs)}ms`,
      );
    t.log(`timing summary\n${summary.join('\n')}`);
  });

  return store;
};

const recordTimingEnabled = (
  t: ExecutionContext,
  label: string,
  elapsedMs: number,
) => {
  const store = getStore(t);
  const prev = store.get(label) || { count: 0, totalMs: 0, maxMs: 0 };
  store.set(label, {
    count: prev.count + 1,
    totalMs: prev.totalMs + elapsedMs,
    maxMs: Math.max(prev.maxMs, elapsedMs),
  });
};

const recordTimingDisabled = (
  _t: ExecutionContext,
  _label: string,
  _elapsedMs: number,
) => {};

export const recordTiming = enabled
  ? recordTimingEnabled
  : recordTimingDisabled;

const timeAsyncEnabled = async <T>(
  t: ExecutionContext,
  label: string,
  fn: () => Promise<T>,
): Promise<T> => {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    recordTiming(t, label, performance.now() - start);
  }
};

const timeAsyncDisabled = <T>(
  _t: ExecutionContext,
  _label: string,
  fn: () => Promise<T>,
): Promise<T> => fn();

export const timeAsync = enabled ? timeAsyncEnabled : timeAsyncDisabled;

const timeSyncEnabled = <T>(
  t: ExecutionContext,
  label: string,
  fn: () => T,
): T => {
  const start = performance.now();
  try {
    return fn();
  } finally {
    recordTiming(t, label, performance.now() - start);
  }
};

const timeSyncDisabled = <T>(
  _t: ExecutionContext,
  _label: string,
  fn: () => T,
): T => fn();

export const timeSync = enabled ? timeSyncEnabled : timeSyncDisabled;
