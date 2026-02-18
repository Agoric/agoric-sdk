import test from 'ava';
import { runJob, type Job } from '../src/schedule-order.ts';

const USDC = { name: 'USDC' };
const BLD = { name: 'BLD' };

const job1info = {
  portfolioId: 4,
  steps: [
    {
      amount: { brand: USDC, value: 3_950_000n },
      dest: '@agoric',
      src: '<Deposit>',
    },
    {
      amount: { brand: USDC, value: 3_950_000n },
      dest: '@noble',
      src: '@agoric',
    },
    {
      amount: { brand: USDC, value: 3_950_000n },
      dest: '@Avalanche',
      detail: { evmGas: 8_029_853_009_929_548n },
      fee: { brand: BLD, value: 5_967_696n },
      src: '@noble',
    },
    {
      amount: { brand: USDC, value: 3_950_000n },
      dest: 'Aave_Avalanche',
      fee: { brand: BLD, value: 5_623_459n },
      src: '@Avalanche',
    },
  ],
  order: [
    [1, [0]],
    [2, [1]],
    [3, [2]],
  ] as Job['order'],
};

const makeRunTask =
  (steps, trace) =>
  async (ix, _running): Promise<void> => {
    await null;
    const m = steps[ix];
    trace(ix, 'chug chug...', `${m.src} -> ${m.dest}`);
    // Simulate failure for testing
    if (m.src === '@Ethereum' && m.dest === 'Aave_Ethereum') {
      throw new Error('Simulated step failure');
    }
  };

test('runJob handles full order', async t => {
  const { steps, order } = job1info;
  const runTask = makeRunTask(steps, t.log);
  const job = { taskQty: steps.length, order };
  await t.notThrowsAsync(runJob(job, runTask, t.log));
});

test('partial failure', async t => {
  const jobInfo = {
    steps: [
      { src: '@agoric', dest: '@noble' },
      { src: '@noble', dest: '@Ethereum' },
      { src: '@Ethereum', dest: 'Aave_Ethereum' }, // This step will fail
      { src: '@noble', dest: '@Arbitrum' },
      { src: '@Arbitrum', dest: 'Aave_Arbitrum' },
    ],
    order: [
      [1, [0]],
      [2, [1]],
      [3, [0]], // Independent of the failing step
      [4, [3]],
    ] as Job['order'],
  };

  const { steps, order } = jobInfo;
  const runTask = makeRunTask(steps, t.log);
  const job = { taskQty: steps.length, order };
  const results = await runJob(job, runTask, t.log);

  t.is(results.length, 5);
  t.is(results[0].status, 'fulfilled');
  t.is(results[1].status, 'fulfilled');
  t.is(results[2].status, 'rejected'); // This step should fail
  t.is(results[3].status, 'fulfilled');
  t.is(results[4].status, 'fulfilled');

  // Check the failure reason
  if (results[2].status === 'rejected') {
    t.regex(results[2].reason.message, /Simulated step failure/);
  }
});

const withResolvers = <T>() => {
  let resolve;
  let reject;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

test('runJob waits for running tasks before detecting loop', async t => {
  const taskA = withResolvers<void>();

  const controlledRunTask = async (ix, _running): Promise<void> => {
    const steps = [
      { src: '@agoric', dest: '@noble' },
      { src: '@noble', dest: '@Ethereum' },
      { src: '@noble', dest: '@Arbitrum' },
      { src: '@other', dest: '@somewhere' },
    ];
    const m = steps[ix];
    t.log('chug chug...', `${m.src} -> ${m.dest}`);

    if (ix === 0) {
      await taskA.promise;
    }
  };

  const job = {
    taskQty: 4,
    order: [
      [1, [0]],
      [2, [0]],
    ] as Job['order'],
  };

  const jobPromise = runJob(job, controlledRunTask, t.log);

  // Let the scheduler run: D completes, scheduler loops, finds no runnable tasks
  // but A is still running - this tests the loop detection logic
  await null;

  taskA.resolve();

  await t.notThrowsAsync(jobPromise, 'wait for running tasks');
});

test('runJob takes advantage of partial order', async t => {
  const jobInfo = {
    steps: [
      { src: '@agoric', dest: '@noble' },
      { src: '@noble', dest: '@Ethereum' },
      { src: '@Etherum', dest: 'Aave_Ethereum' },
      { src: '@noble', dest: '@Arbitrum' },
      { src: '@Arbitrum', dest: 'Aave_Arbitrum' },
    ],
    order: [
      [1, [0]],
      [2, [1]],
      [3, [0]],
      [4, [3]],
    ] as Job['order'],
  };

  const { steps, order } = jobInfo;
  const runTask = makeRunTask(steps, t.log);
  const job = { taskQty: steps.length, order };
  await t.notThrowsAsync(runJob(job, runTask, t.log));
});

test('runJob fails on cycle', async t => {
  const jobInfo = {
    steps: [
      { src: '@agoric', dest: '@noble' },
      { src: '@noble', dest: '@Avalanche' },
      { src: '@Avalanche', dest: '@noble' },
    ],
    order: [
      [1, [0, 2]],
      [2, [1]],
    ] as Job['order'],
  };

  const { steps, order } = jobInfo;
  const runTask = async (_ix, _running) => {
    throw t.fail('should not be called');
  };
  const job = { taskQty: steps.length, order };

  await t.throwsAsync(runJob(job, runTask, t.log), {
    message: 'Dependency cycle detected involving node 1',
  });
});

test('runJob handles empty list of dependencies', async t => {
  const jobInfo = {
    steps: [{ src: '@agoric', dest: '<Cash>' }],
    order: [[0, []]] as Job['order'],
  };

  const { steps, order } = jobInfo;
  const runTask = makeRunTask(steps, t.log);
  const job = { taskQty: steps.length, order };
  await t.notThrowsAsync(runJob(job, runTask, t.log));
});

test('portfolio8 log entry', async t => {
  // 2025-10-23T04:11:12.334Z SwingSet: vat: v288: ----- PPLN,11
  const logEntry = {
    portfolioId: 8,
    plan: [
      {
        src: '<Deposit>',
        dest: '@agoric',
        amount: { brand: USDC, value: 3_000_000n },
      },
      {
        src: '@agoric',
        dest: '@noble',
        amount: { brand: USDC, value: 3_000_000n },
      },
      {
        src: '@noble',
        dest: '@Avalanche',
        amount: { brand: USDC, value: 900_000n },
        detail: { evmGas: 8_322_004_921_144_062n },
        fee: { brand: BLD, value: 6_506_570n },
      },
      {
        src: '@noble',
        dest: '@Optimism',
        amount: { brand: USDC, value: 1_350_000n },
        detail: { evmGas: 41_522_135_000_238n },
        fee: { brand: BLD, value: 5_381_497n },
      },
      {
        src: '@noble',
        dest: '@Base',
        amount: { brand: USDC, value: 750_000n },
        detail: { evmGas: 41_522_135_000_238n },
        fee: { brand: BLD, value: 7_243_407n },
      },
      {
        src: '@Avalanche',
        dest: 'Aave_Avalanche',
        amount: { brand: USDC, value: 900_000n },
        fee: { brand: BLD, value: 5_767_747n },
      },
      {
        src: '@Optimism',
        dest: 'Aave_Optimism',
        amount: { brand: USDC, value: 1_350_000n },
        fee: { brand: BLD, value: 5_331_879n },
      },
      {
        src: '@Base',
        dest: 'Compound_Base',
        amount: { brand: USDC, value: 750_000n },
        fee: { brand: BLD, value: 5_944_969n },
      },
    ],
  };

  const order = [
    [1, [0]],
    [2, [1]],
    [3, [1]],
    [4, [1]],
    [5, [2]],
    [6, [3]],
    [7, [4]],
  ] as Job['order'];

  const { plan: steps } = logEntry;
  const runTask = makeRunTask(steps, t.log);
  const job = { taskQty: steps.length, order };
  await t.notThrowsAsync(runJob(job, runTask, t.log));
});

const range = (n: number) => Array.from(Array(n).keys());
const checkAllStarted = test.macro({
  title: provided => `checkAll: ${provided}`,
  exec: async (t, { steps, order }) => {
    const started = new Set();
    const runTask = makeRunTask(steps, (ix, _r) => started.add(ix));
    await runJob({ order, taskQty: steps.length }, runTask, t.log);
    t.deepEqual([...started].sort(), range(steps.length));
  },
});

test('unmentioned steps implicitly have no dependencies', checkAllStarted, {
  steps: [{ id: 'a-noble' }, { id: 'n-cash' }, { id: 'n-out' }],
  order: [[2, [0]]],
});

test('one step may depend on many', checkAllStarted, {
  steps: [{ id: 'a-noble' }, { id: 'n-cash' }, { id: 'n-out' }],
  order: [[2, [0, 1]]],
});

test('independent chains', checkAllStarted, {
  steps: [{ id: 'a-noble' }, { id: 'o-arb' }],
  order: [],
});

test('diamond', checkAllStarted, {
  steps: [{ id: 'a->b' }, { id: 'a->c' }, { id: 'b->d' }, { id: 'c->d' }],
  order: [
    [2, [0]],
    [3, [1]],
  ],
});

const parseSchedulerLine = (line: string) => {
  const m = line.match(
    /\b(started|done)\s+(\d+)(?:\s+running\s+(\d+(?:\s+\d+)*))?$/,
  );
  if (!m) throw Error(`unable to parse scheduler line: ${line}`);
  const [, kind, ixRaw, runningRaw] = m;
  return harden({
    kind,
    ix: Number(ixRaw),
    running: runningRaw ? runningRaw.split(/\s+/).map(n => Number(n)) : undefined,
  });
};

const flow5SchedulerEvidence = harden({
  raw: {
    checkingLine: "rebalance.portfolio96.flow5,3997  checking 5 moves",
    planOrderLine:
      "PPLN.portfolio96.flow5,3996  TODO(#11782): vet plan { ... order: [ [ 2, [ 1 ] ], [ 3, [ 2 ] ], [ 4, [ 3 ] ] ] }",
    flowDoneLine: "rebalance.portfolio96.flow5,3997  stepFlow done",
    schedulerLines: [
      "rebalance.portfolio96.flow5,3997  started 0 running 0",
      "rebalance.portfolio96.flow5,3997  started 1 running 0 1",
      "rebalance.portfolio96.flow5,3997  done 1",
      "rebalance.portfolio96.flow5,3997  started 2 running 0 2",
      "rebalance.portfolio96.flow5,3997  done 2",
      "rebalance.portfolio96.flow5,3997  started 3 running 0 3",
      "rebalance.portfolio96.flow5,3997  done 3",
      "rebalance.portfolio96.flow5,3997  started 4 running 0 4",
      "rebalance.portfolio96.flow5,3997  done 4",
    ],
  },
  parsed: {
    taskQty: 5,
    order: [
      [2, [1]],
      [3, [2]],
      [4, [3]],
    ] as Job['order'],
    scheduler: [
      { kind: 'started', ix: 0, running: [0] },
      { kind: 'started', ix: 1, running: [0, 1] },
      { kind: 'done', ix: 1, running: undefined },
      { kind: 'started', ix: 2, running: [0, 2] },
      { kind: 'done', ix: 2, running: undefined },
      { kind: 'started', ix: 3, running: [0, 3] },
      { kind: 'done', ix: 3, running: undefined },
      { kind: 'started', ix: 4, running: [0, 4] },
      { kind: 'done', ix: 4, running: undefined },
    ],
  },
});

test('portfolio96.flow5 parser output matches concrete scheduler data', t => {
  const { raw, parsed } = flow5SchedulerEvidence;
  const qtyMatch = raw.checkingLine.match(/checking\s+(\d+)\s+moves/);
  t.truthy(qtyMatch);
  t.deepEqual(Number(qtyMatch?.[1]), parsed.taskQty);

  const orderPairs = [
    ...raw.planOrderLine.matchAll(/\[\s*(\d+)\s*,\s*\[\s*(\d+)\s*\]\s*\]/g),
  ];
  const order = orderPairs.map(([, dep, pred]) => [Number(dep), [Number(pred)]]);
  t.deepEqual(order, parsed.order);

  const scheduler = raw.schedulerLines.map(parseSchedulerLine);
  t.deepEqual(scheduler, parsed.scheduler);
});

test('runJob trace shape matches portfolio96.flow5 scheduler logs', async t => {

  const formatRunJobTrace = (args: unknown[]) => {
    const [kind, ix, maybeRunning, ...rest] = args;
    if (kind === 'started' && maybeRunning === 'running') {
      return `started ${ix} running ${rest.join(' ')}`;
    }
    if (kind === 'done') {
      return `done ${ix}`;
    }
    return null;
  };

  const waitFor = async (
    predicate: () => boolean,
    message: string,
    maxTurns = 200,
  ) => {
    for (let i = 0; i < maxTurns; i += 1) {
      if (predicate()) return;
      await Promise.resolve();
    }
    t.fail(message);
  };

  const expectedTrace = flow5SchedulerEvidence.parsed.scheduler;

  const controls = {
    aaveSupplyBase: withResolvers<void>(),
    cctpBaseToAgoric: withResolvers<void>(),
    ibcAgoricToNoble: withResolvers<void>(),
    cctpNobleToOptimism: withResolvers<void>(),
    compoundSupplyOptimism: withResolvers<void>(),
  };
  const controlKeys = Object.keys(controls) as Array<keyof typeof controls>;

  const actualTrace: ReturnType<typeof parseSchedulerLine>[] = [];
  const runTask = async (ix: number): Promise<void> =>
    controls[controlKeys[ix]].promise;
  let settled = false;

  const resultsP = runJob(
    {
      taskQty: flow5SchedulerEvidence.parsed.taskQty,
      order: flow5SchedulerEvidence.parsed.order,
    },
    runTask,
    (...args: unknown[]) => {
      const line = formatRunJobTrace(args);
      if (!line) return;
      actualTrace.push(parseSchedulerLine(line));
    },
  );
  void resultsP.then(() => {
    settled = true;
  });

  // First runnable tasks from parsed order are 0 and 1.
  await waitFor(
    () => actualTrace.length >= 2,
    'expected first two scheduler trace lines',
  );
  t.deepEqual(actualTrace, expectedTrace.slice(0, 2));

  // Replay observed completions from logs: 1 -> 2 -> 3 -> 4.
  const expectedLengthAfterResolve = {
    cctpBaseToAgoric: 4,
    ibcAgoricToNoble: 6,
    cctpNobleToOptimism: 8,
    compoundSupplyOptimism: 9,
  } as const;
  const resolveSequence = [
    'cctpBaseToAgoric',
    'ibcAgoricToNoble',
    'cctpNobleToOptimism',
    'compoundSupplyOptimism',
  ] as const;
  for (const stepId of resolveSequence) {
    controls[stepId].resolve();
    await waitFor(
      () => actualTrace.length >= expectedLengthAfterResolve[stepId],
      `expected scheduler trace to advance after resolving ${stepId}`,
    );
  }

  t.deepEqual(actualTrace, expectedTrace);
  t.false(
    settled,
    'job should remain pending while step 0 stays unresolved (as in logs)',
  );

  controls.aaveSupplyBase.resolve();
  const results = await resultsP;
  t.true(results.every(r => r.status === 'fulfilled'));
});
