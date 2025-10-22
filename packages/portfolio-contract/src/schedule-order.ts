type Ix = number;
type Job<Move> = {
  steps: Move[];
  /** entries of map from virtex to vertexes it depends on */
  order: Array<[Ix, Ix[]]>;
};

const range = (xs: Array<unknown>) => Array.from(xs, (_, i) => i);

const execute = async (m, trace): Promise<void> => {
  trace('chug chug...', `${m.src} -> ${m.dest}`);
};

export const runJob = async <M>(job: Job<M>, trace) => {
  const running = new Map<Ix, Promise<Ix>>();

  const { steps } = job;
  const todo = new Set(range(steps));
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
      const done = execute(steps[ix], trace).then(() => {
        trace('finished', ix);
        return ix;
      });
      running.set(ix, done);
      todo.delete(ix);
      trace('starting', ix, 'running', ...running.keys());
    }

    try {
      if (running.size === 0) break; // assert?
      const winnerIx = await Promise.any(running.values());
      running.delete(winnerIx);
      for (const [ix, deps] of order.entries()) {
        deps.delete(winnerIx);
        if (deps.size === 0) {
          order.delete(ix);
        }
      }
    } catch (err) {
      trace('error! TODO!', err);
      return;
    }
  }
};
