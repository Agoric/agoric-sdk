/**
 * @file schedule async tasks based on partial order
 * @see {runJob}
 */

/** zero based index */
type Ix = number;
export type Job = {
  taskQty: number;
  /** entries of map from vertex to vertexes it depends on */
  order: Array<[Ix, Ix[]]>;
};

const range = (n: number) => Array.from(Array(n).keys());

const ok = {
  status: 'fulfilled',
  value: undefined,
} as PromiseSettledResult<void>;
harden(ok);

/**
 * call runTask(ix, ...) for each 0 <= ix < job.taskQty,
 * only when dependent tasks are finished.
 */
export const runJob = async (
  job: Job,
  runTask: (ix: Ix, running: number[]) => Promise<void>,
  trace: (...args: unknown[]) => void,
): Promise<PromiseSettledResult<void>[]> => {
  const running = new Map<Ix, Promise<Ix>>();

  const { taskQty } = job;
  const taskIxs = range(taskQty);
  const todo = new Set(taskIxs);
  const results = taskIxs.map(_ => ok);

  /** keys with empty dependencies are omitted */
  const order: Map<Ix, Set<Ix>> = new Map(
    job.order.flatMap(([ix, deps]) =>
      deps.length > 0 ? [[ix, new Set(deps)]] : [],
    ),
  );
  const ready = (ix: Ix) => !order.has(ix);

  const failTaskAndAncestors = (ix: Ix, reason: unknown) => {
    trace('fail', ix, reason);
    todo.delete(ix);
    results[ix] = { status: 'rejected', reason };

    const cascade = Error(`predecessor ${ix} failed`, { cause: reason });
    for (const [candidate, deps] of order.entries()) {
      if (deps.has(ix)) {
        failTaskAndAncestors(candidate, cascade);
      }
    }
  };

  await null;

  while (todo.size > 0) {
    const runnable = [...todo].filter(v => ready(v) && !running.has(v));
    // trace('runnable', ...runnable);
    if (!runnable.length && !running.size) {
      trace('loop! todo', ...todo, 'running', ...running.keys());
      throw Error('Job dependency loop prevents completion.');
    }
    for (const ix of runnable) {
      const done = runTask(ix, [...running.keys(), ix])
        .then(() => {
          trace('done', ix);
          return ix;
        })
        .catch(reason => {
          failTaskAndAncestors(ix, reason);
          return ix;
        });
      running.set(ix, done);
      todo.delete(ix);
      trace('started', ix, 'running', ...running.keys());
    }

    if (running.size === 0) break;

    // The following `await` cannot throw because every promise in `running`
    // already has a .catch() handler (attached above).
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
