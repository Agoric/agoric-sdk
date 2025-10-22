import test from 'ava';
import { runJob } from '../src/schedule-order.ts';

const USDC = { name: 'USDC' };
const BLD = { name: 'BLD' };

const job1 = {
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
  ] as Array<[number, number[]]>,
};

test('runJob handles full order', async t => {
  await t.notThrowsAsync(runJob(job1, t.log));
});

test('partial failure', async t => {
  const job = {
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
    ] as Array<[number, number[]]>,
  };

  const results = await runJob(job, t.log);
  
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

test.todo('partial progress');

test('runJob takes advantage of partial order', async t => {
  const job = {
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
    ] as Array<[number, number[]]>,
  };

  await t.notThrowsAsync(runJob(job, t.log));
});

test('runJob fails on cycle', async t => {
  const job = {
    steps: [
      { src: '@agoric', dest: '@noble' },
      { src: '@noble', dest: '@Avalanche' },
      { src: '@Avalanche', dest: '@noble' },
    ],
    order: [
      [1, [0, 2]],
      [2, [1]],
    ] as Array<[number, number[]]>,
  };

  await t.throwsAsync(runJob(job, t.log), { message: 'loop!' });
});
