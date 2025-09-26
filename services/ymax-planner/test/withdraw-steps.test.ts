/** @file tests for withdrawStepsFromAllocation (greedy, hub-first) */
import test from 'ava';

import { AmountMath, type Brand } from '@agoric/ertp';
import { Far } from '@endo/pass-style';
import type { TargetAllocation } from '@aglocal/portfolio-contract/src/type-guards.js';
import { withdrawStepsFromAllocation } from '../src/plan-deposit.ts';

type NatBrand = Brand<'nat'>;
const withdrawBrand = Far('mock brand') as NatBrand;
const amt = (value: bigint) => AmountMath.make(withdrawBrand, value);

const step = (value: bigint, src: string) => ({
  amount: amt(value),
  src,
  dest: '<Cash>' as const,
});

// 1) Hub-first when both hub and pools are over-weight; withdraw smaller than hub need -> single step from hub
// Current: @noble 150, USDN 500, Aave 300; Withdraw 100; Alloc 50/50
// Targets (alloc keys): USDN 350, Aave 350; Hubs zeroed -> needs: @noble 150, USDN 150
// Steps: [100 from @noble]
test('withdrawStepsFromAllocation - hub-first single-step when hub covers', t => {
  const withdrawal = amt(100n);
  const current = {
    '@noble': amt(150n),
    USDN: amt(500n),
    Aave_Arbitrum: amt(300n),
  } as const;
  const allocation: TargetAllocation = { USDN: 50n, Aave_Arbitrum: 50n };

  const steps = withdrawStepsFromAllocation(withdrawal, current, allocation);
  t.deepEqual(steps, [step(100n, '@noble')] as const);
});

// 2) Hub-first then pool when withdraw exceeds hub need
// Same as above but Withdraw 200 -> Steps: [150 from @noble, 50 from USDN]
test('withdrawStepsFromAllocation - hub drained then largest-need pool', t => {
  const withdrawal = amt(200n);
  const current = {
    '@noble': amt(150n),
    USDN: amt(500n),
    Aave_Arbitrum: amt(300n),
  } as const;
  const allocation: TargetAllocation = { USDN: 50n, Aave_Arbitrum: 50n };

  const steps = withdrawStepsFromAllocation(withdrawal, current, allocation);
  t.deepEqual(steps, [step(150n, '@noble'), step(50n, 'USDN')] as const);
});

// 3) Single largest over-weight pool covers withdraw -> single step
// Current: USDN 600, Aave 200; Withdraw 100; Alloc 50/50 -> USDN need 250, Aave increases -> only USDN
// Steps: [100 from USDN]
test('withdrawStepsFromAllocation - single pool covers withdraw', t => {
  const withdrawal = amt(100n);
  const current = { USDN: amt(600n), Aave_Arbitrum: amt(200n) } as const;
  const allocation: TargetAllocation = { USDN: 50n, Aave_Arbitrum: 50n };

  const steps = withdrawStepsFromAllocation(withdrawal, current, allocation);
  t.deepEqual(steps, [step(100n, 'USDN')] as const);
});

// 4) Zero withdraw -> no steps
// Early return path
test('withdrawStepsFromAllocation - zero withdraw yields no steps', t => {
  const withdrawal = amt(0n);
  const current = {
    USDN: amt(500n),
    Aave_Arbitrum: amt(300n),
    '@noble': amt(100n),
  } as const;
  const allocation: TargetAllocation = { USDN: 50n, Aave_Arbitrum: 50n };

  const steps = withdrawStepsFromAllocation(withdrawal, current, allocation);
  t.deepEqual(steps, [] as const);
});

// 5) Multiple hubs then pool ordering by need
// Current: @noble 60, @arbitrum 40, USDN 500, Aave 300; Withdraw 120; Alloc 50/50 -> USDN target 350, Aave 350
// Needs: @noble 60, @arbitrum 40, USDN 150; Steps: [60 @noble, 40 @arbitrum, 20 USDN]
test('withdrawStepsFromAllocation - multiple hubs then pool by need', t => {
  const withdrawal = amt(120n);
  const current = {
    '@noble': amt(60n),
    '@arbitrum': amt(40n),
    USDN: amt(500n),
    Aave_Arbitrum: amt(300n),
  } as const;
  const allocation: TargetAllocation = { USDN: 50n, Aave_Arbitrum: 50n };

  const steps = withdrawStepsFromAllocation(withdrawal, current, allocation);
  t.deepEqual(steps, [
    step(60n, '@noble'),
    step(40n, '@arbitrum'),
    step(20n, 'USDN'),
  ] as const);
});
