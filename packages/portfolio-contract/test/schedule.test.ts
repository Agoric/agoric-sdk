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

test.todo('partial progress');

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
  const { log } = console;
  log('LOG!');
  const runTask = makeRunTask(steps, log);
  const job = { taskQty: steps.length, order };
  await t.notThrowsAsync(runJob(job, runTask, log));
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
  const runTask = makeRunTask(steps, t.log);
  const job = { taskQty: steps.length, order };

  await t.throwsAsync(runJob(job, runTask, t.log), { message: 'loop!' });
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
