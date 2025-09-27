/** @file tests for planDepositOnlyToTargets (deposit-only greedy planner) */
import test from 'ava';

import { AmountMath, type Brand } from '@agoric/ertp';
import { Far } from '@endo/pass-style';
import { planDepositOnlyToTargets } from '../src/plan-deposit.ts';

// Minimal MovementDesc type subset to match shape in tests

type NatBrand = Brand<'nat'>;
const brand = Far('mock brand') as NatBrand;
const amt = (value: bigint) => AmountMath.make(brand, value);

const step = (value: bigint, dest: string) => ({ amount: amt(value), src: '+agoric' as const, dest });

// 1) Basic: distribute greedily to largest need
// current: USDN 100, Aave 100, +agoric 0 (ignored)
// target:  USDN 300, Aave 150
// deposit: 200 -> steps: [USDN 200]
test('planDepositOnlyToTargets - largest need first, single step', async t => {
  const amount = amt(200n);
  const current = { USDN: amt(100n), Aave_Arbitrum: amt(100n), '+agoric': amt(0n) } as const;
  const target = { USDN: amt(300n), Aave_Arbitrum: amt(150n) } as const;

  const steps = await planDepositOnlyToTargets(amount, current, target, {} as any, brand);
  t.deepEqual(steps, [step(200n, 'USDN')] as const);
});

// 2) Split across destinations in greedy order
// current: USDN 100, Aave 100
// target:  USDN 250 (need 150), Aave 180 (need 80)
// deposit: 200 -> [USDN 150, Aave 50]
test('planDepositOnlyToTargets - split across multiple pools greedily', async t => {
  const amount = amt(200n);
  const current = { USDN: amt(100n), Aave_Arbitrum: amt(100n) } as const;
  const target = { USDN: amt(250n), Aave_Arbitrum: amt(180n) } as const;

  const steps = await planDepositOnlyToTargets(amount, current, target, {} as any, brand);
  t.deepEqual(steps, [step(150n, 'USDN'), step(50n, 'Aave_Arbitrum')] as const);
});

// 3) Zero amount -> no steps
test('planDepositOnlyToTargets - zero amount produces no steps', async t => {
  const amount = amt(0n);
  const current = { USDN: amt(100n) } as const;
  const target = { USDN: amt(200n) } as const;

  const steps = await planDepositOnlyToTargets(amount, current, target, {} as any, brand);
  t.deepEqual(steps, [] as const);
});

// 4) Ignore non-pool targets ('<Cash>', hubs '@...')
// current: USDN 100, @noble 50, '<Cash>' 0
// target:  USDN 150, @noble 70, '<Cash>' 20 -> only USDN considered (need 50)
// deposit: 50 -> [USDN 50]
test('planDepositOnlyToTargets - ignore non-pool destinations', async t => {
  const amount = amt(50n);
  const current = { USDN: amt(100n), '@noble': amt(50n), '<Cash>': amt(0n) } as const;
  const target = { USDN: amt(150n), '@noble': amt(70n), '<Cash>': amt(20n) } as const;

  const steps = await planDepositOnlyToTargets(amount, current, target, {} as any, brand);
  t.deepEqual(steps, [step(50n, 'USDN')] as const);
});

// 5) Throw if not enough headroom to absorb deposit
// current: USDN 100
// target:  USDN 150 (need 50)
// deposit: 100 -> error

test('planDepositOnlyToTargets - throws when insufficient pool headroom', async t => {
  const amount = amt(100n);
  const current = { USDN: amt(100n) } as const;
  const target = { USDN: amt(150n) } as const;

  await t.throwsAsync(() => planDepositOnlyToTargets(amount, current, target, {} as any, brand), {
    message: /not enough pool headroom to absorb deposit/,
  });
});
