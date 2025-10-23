type Ix = number;
export type Job = {
  taskQty: number;
  /** entries of map from virtex to vertexes it depends on */
  order: Array<[Ix, Ix[]]>;
};

const range = (n: number) => Array.from(Array(n).keys());

/**
 * ref [Promise.allSettled Return value](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled#return_value)
 */
type PromiseSettledResult<T> =
  | { status: 'fulfilled'; value: T }
  | { status: 'rejected'; reason: any };

const ok = {
  status: 'fulfilled',
  value: undefined,
} as PromiseSettledResult<void>;
harden(ok);

export const runJob = async <M>(
  job: Job,
  runTask: (ix: Ix, trace) => Promise<void>,
  trace,
): Promise<PromiseSettledResult<void>[]> => {
  const running = new Map<Ix, Promise<Ix>>();

  const { taskQty } = job;
  const taskIxs = range(taskQty);
  const todo = new Set(taskIxs);
  const results = taskIxs.map(_ => ok);
  const order: Map<Ix, Set<Ix>> = new Map(
    job.order.map(([ix, deps]) => [ix, new Set(deps)]),
  );

  /** no dependencies */
  const ready = (ix: Ix) => !order.has(ix);

  while (todo.size > 0) {
    const runnable = [...todo].filter(v => !running.has(v) && ready(v));
    trace('runnable', ...runnable);
    if (!runnable.length) {
      trace('loop! todo', ...todo, 'running', ...running.keys());
      throw Error('loop!');
    }
    for (const ix of runnable) {
      const done = runTask(ix, trace)
        .then(() => {
          trace('done', ix);
          return ix;
        })
        .catch(reason => {
          trace('fail', ix, reason);
          results[ix] = { status: 'rejected', reason };
          return ix;
        });
      running.set(ix, done);
      todo.delete(ix);
      trace('starting', ix, 'running', ...running.keys());
    }

    if (running.size === 0) break; // assert?
    const winnerIx = await Promise.any(running.values());
    running.delete(winnerIx);
    for (const [ix, deps] of order.entries()) {
      deps.delete(winnerIx);
      if (deps.size === 0) {
        order.delete(ix);
      }
    }
  }

  return harden(results);
};
