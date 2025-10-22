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

test.todo('partial failure');
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
