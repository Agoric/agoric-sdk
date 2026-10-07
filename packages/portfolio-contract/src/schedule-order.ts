/**
 * @file schedule async tasks based on partial order
 * @see {runJob}
 */
import { partialMap } from '@agoric/internal/src/js-utils.js';

/** zero based index */
type Ix = number;
export type Job = {
  taskQty: number;
  /** entries of map from vertex to vertexes it depends on */
  order: Array<[Ix, Ix[]]>;
};

const range = (n: number) => Array.from(Array(n).keys());

/** Return dependencies that require each task to follow its predecessor. */
export const fullOrder = (length: number): Job['order'] =>
  range(Math.max(0, length - 1)).map(lo => [lo + 1, [lo]]);

const ok = {
  status: 'fulfilled',
  value: undefined,
} as PromiseSettledResult<void>;
harden(ok);

const cycleCheck = (
  qty: number,
  orderArray: Array<[Ix, Ix[]]>,
): Map<Ix, Set<Ix>> => {
  const checkNode = (node: Ix): Ix => {
    if (!Number.isInteger(node) || node < 0 || node >= qty) {
      throw new Error(`Invalid node index: ${node}`);
    }
    return node;
  };

  const visited = new Set<Ix>();
  const recursionStack = new Set<Ix>();

  /** keys with empty dependencies are omitted */
  const order: Map<Ix, Set<Ix>> = new Map(
    partialMap(orderArray, ([ix, deps]) => {
      const checkedIx = checkNode(ix);
      return deps.length > 0 && [checkedIx, new Set(deps.map(checkNode))];
    }),
  );

  const hasCycle = (node: Ix): boolean => {
    if (recursionStack.has(node)) {
      return true; // Back edge found - cycle detected
    }
    if (visited.has(node)) {
      return false; // Already processed this node
    }

    visited.add(node);
    recursionStack.add(node);

    const deps = order.get(node) || new Set();
    for (const dep of deps) {
      if (hasCycle(dep)) {
        return true;
      }
    }

    recursionStack.delete(node);
    return false;
  };

  // Check all nodes for cycles
  for (let node = 0; node < qty; node += 1) {
    if (!visited.has(node)) {
      if (hasCycle(node)) {
        throw new Error(`Dependency cycle detected involving node ${node}`);
      }
    }
  }

  return order;
};

/**
 * Track which tasks are ready as their declared dependencies complete.
 *
 * `ready()` claims every currently ready task. `complete()` satisfies a
 * claimed task for its dependents, while `cancel()` removes it without
 * satisfying them. `dependents()` finds tasks that directly require a given
 * task, and `pending()` reports whether unclaimed tasks remain.
 *
 * @throws {Error} if a task index is invalid or the dependencies contain a cycle
 */
export const makeSchedule = (job: Job) => {
  const dependencies = cycleCheck(job.taskQty, job.order);
  const todo = new Set(range(job.taskQty));

  return harden({
    ready: (): number[] => {
      const ready = [...todo].filter(ix => !dependencies.has(ix));
      for (const ix of ready) todo.delete(ix);
      return harden(ready);
    },
    complete: (completed: number): void => {
      for (const [ix, deps] of dependencies.entries()) {
        deps.delete(completed);
        if (deps.size === 0) dependencies.delete(ix);
      }
    },
    cancel: (ix: number): void => {
      todo.delete(ix);
    },
    dependents: (dependency: number): number[] =>
      harden(
        [...dependencies.entries()]
          .filter(([_ix, deps]) => deps.has(dependency))
          .map(([ix]) => ix),
      ),
    pending: (): boolean => todo.size > 0,
  });
};
harden(makeSchedule);

/**
 * call runTask(ix, ...) for each 0 <= ix < job.taskQty,
 * only when dependent tasks are finished.
 *
 * @throws {Error} before any calls to runTask() in case of cycles
 */
export const runJob = async (
  job: Job,
  runTask: (ix: Ix, running: number[]) => Promise<void>,
  trace: (...args: unknown[]) => void,
  makeError = (ix: Ix, reason) =>
    Error(`predecessor ${ix} failed`, {
      cause: reason,
    }),
): Promise<PromiseSettledResult<void>[]> => {
  const running = new Map<Ix, Promise<Ix>>();

  const { taskQty } = job;
  const schedule = makeSchedule(job);
  const taskIxs = range(taskQty);
  const results = taskIxs.map(_ => ok);

  const failTaskAndAncestors = (ix: Ix, reason: unknown) => {
    if (results[ix]?.status === 'rejected') return;
    trace('fail', ix, reason);
    schedule.cancel(ix);
    results[ix] = { status: 'rejected', reason };

    const cascade = makeError(ix, reason);
    for (const candidate of schedule.dependents(ix)) {
      failTaskAndAncestors(candidate, cascade);
    }
  };

  await null;

  while (schedule.pending() || running.size > 0) {
    const runnable = schedule.ready();
    // trace('runnable', ...runnable);
    if (!runnable.length && !running.size) {
      trace('loop! pending schedule has no ready tasks');
      throw Error('Job dependency loop prevents completion.');
    }
    for (const ix of runnable) {
      const runningNow = [...running.keys(), ix];
      let taskP: Promise<void>;
      try {
        taskP = runTask(ix, runningNow);
      } catch (reason) {
        failTaskAndAncestors(ix, reason);
        taskP = Promise.resolve();
      }
      const done = Promise.resolve(taskP)
        .then(() => {
          trace('done', ix);
          return ix;
        })
        .catch(reason => {
          failTaskAndAncestors(ix, reason);
          return ix;
        });
      running.set(ix, done);
      trace('started', ix, 'running', ...running.keys());
    }

    if (running.size === 0) continue;

    // The following `await` cannot throw because every promise in `running`
    // already has a .catch() handler (attached above).
    const winnerIx = await Promise.any(running.values());
    running.delete(winnerIx);
    if (results[winnerIx]?.status === 'fulfilled') {
      schedule.complete(winnerIx);
    }
  }

  return harden(results);
};
