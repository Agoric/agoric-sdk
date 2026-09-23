export type RunLimited = <T>(task: () => Promise<T>) => Promise<T>;
export type RunLimitedByKey<K extends object> = <T>(
  key: K,
  task: () => Promise<T>,
) => Promise<T>;

export const makeConcurrencyLimiter = (capacity: number): RunLimited => {
  if (!Number.isInteger(capacity) || capacity <= 0) {
    throw RangeError('capacity must be a positive integer');
  }

  let active = 0;
  const waiters: Array<() => void> = [];

  const acquire = () =>
    new Promise<void>(resolve => {
      if (active < capacity) {
        active += 1;
        return resolve();
      }
      waiters.push(resolve);
    });

  const release = () => {
    const next = waiters.shift();
    if (next) {
      next();
    } else {
      active -= 1;
    }
  };

  return async task => {
    await acquire();
    try {
      return await task();
    } finally {
      release();
    }
  };
};

export const makeKeyedConcurrencyLimiter = <K extends object>(
  capacity: number,
): RunLimitedByKey<K> => {
  const limiters = new WeakMap<K, RunLimited>();
  return (key, task) => {
    let runLimited = limiters.get(key);
    if (!runLimited) {
      runLimited = makeConcurrencyLimiter(capacity);
      limiters.set(key, runLimited);
    }
    return runLimited(task);
  };
};
