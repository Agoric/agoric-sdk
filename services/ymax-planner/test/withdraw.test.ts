/** @file tests for withdrawTargetsFromAllocation */
import test from 'ava';

import { AmountMath, type Brand } from '@agoric/ertp';
import { Far } from '@endo/pass-style';
import type { TargetAllocation } from '@aglocal/portfolio-contract/src/type-guards.js';
import { withdrawTargetsFromAllocation } from '../src/plan-deposit.ts';

type NatBrand = Brand<'nat'>;
const withdrawBrand = Far('mock brand') as NatBrand;
const amt = (value: bigint) => AmountMath.make(withdrawBrand, value);

// using deepEqual against full objects with Nat amounts

// 1) Basic withdrawal with 3 pools
// Current: 500/300/200; Withdraw: 300; Weights: 50/30/20 -> Targets: 350/210/140; Cash += 300
test('withdrawTargetsFromAllocation - basic', t => {
  const withdrawal = amt(300n);
  const current = {
    USDN: amt(500n),
    Aave_Arbitrum: amt(300n),
    Compound_Arbitrum: amt(200n),
  };
  const allocation: TargetAllocation = {
    USDN: 50n,
    Aave_Arbitrum: 30n,
    Compound_Arbitrum: 20n,
  };

  const res = withdrawTargetsFromAllocation(withdrawal, current, allocation);
  t.deepEqual(res, {
    USDN: amt(350n),
    Aave_Arbitrum: amt(210n),
    Compound_Arbitrum: amt(140n),
    '<Cash>': amt(300n),
  } as const);
});

// 2) Partial allocation: pools not listed remain unchanged (no target entry)
// Current: USDN 400, Aave 300, Compound 300 (not allocated)
// Withdraw: 200; Alloc 60/40 -> sum(current in alloc)=700 -> Targets: 300/200
// No entry for Compound_Arbitrum; Cash += 200
test('withdrawTargetsFromAllocation - partial allocation leaves others unchanged', t => {
  const withdrawal = amt(200n);
  const current = {
    USDN: amt(400n),
    Aave_Arbitrum: amt(300n),
    Compound_Arbitrum: amt(300n),
  };
  const allocation: TargetAllocation = {
    USDN: 60n,
    Aave_Arbitrum: 40n,
  };

  const res = withdrawTargetsFromAllocation(withdrawal, current, allocation);
  t.deepEqual(res, {
    USDN: amt(300n),
    Aave_Arbitrum: amt(200n),
    '<Cash>': amt(200n),
  } as const);
});

// 3) Remainder goes to max-weight (ties favor first entry)
// Current: 500/300/201 (sum 1001); Withdraw: 100 -> total 901
// Equal weights 1/1/1 -> 901 / 3 = 300 remainder 1 -> goes to first key (USDN)
// Targets: USDN 301, Aave 300, Compound 300
test('withdrawTargetsFromAllocation - rounding remainder assignment', t => {
  const withdrawal = amt(100n);
  const current = {
    USDN: amt(500n),
    Aave_Arbitrum: amt(300n),
    Compound_Arbitrum: amt(201n),
  };
  const allocation: TargetAllocation = {
    USDN: 1n,
    Aave_Arbitrum: 1n,
    Compound_Arbitrum: 1n,
  };

  const res = withdrawTargetsFromAllocation(withdrawal, current, allocation);
  // Aave_Arbitrum remains at 300n -> omitted from result
  t.deepEqual(res, {
    USDN: amt(301n),
    Compound_Arbitrum: amt(300n),
    '<Cash>': amt(100n),
  } as const);
});

// 4) Negative total should throw when withdrawing more than covered by selected pools
// Current: zero balances; Withdraw: 100 -> error
test('withdrawTargetsFromAllocation - throws when total after delta negative', t => {
  const withdrawal = amt(100n);
  const current = {
    USDN: amt(0n),
    Aave_Arbitrum: amt(0n),
  };
  const allocation: TargetAllocation = {
    USDN: 50n,
    Aave_Arbitrum: 50n,
  };

  t.throws(
    () => withdrawTargetsFromAllocation(withdrawal, current, allocation),
    {
      message: /total after delta must not be negative/,
    },
  );
});

// 5) Hub balances (@chain) with non-zero current are zeroed in targets
// Current: USDN 500, @noble 100, @arbitrum 50; Withdraw: 200; Alloc: USDN 100
// Targets: USDN 300; @noble 0; @arbitrum 0; Cash += 200
test('withdrawTargetsFromAllocation - hub balances are zeroed', t => {
  const withdrawal = amt(200n);
  const current = {
    USDN: amt(500n),
    '@noble': amt(100n),
    '@arbitrum': amt(50n),
  } as const;
  const allocation: TargetAllocation = { USDN: 100n };

  const res = withdrawTargetsFromAllocation(withdrawal, current, allocation);
  t.deepEqual(res, {
    USDN: amt(300n),
    '@noble': amt(0n),
    '@arbitrum': amt(0n),
    '<Cash>': amt(200n),
  } as const);
});

// 6) Zero withdrawal still rebalances by allocation weights
test('withdrawTargetsFromAllocation - zero withdrawal still rebalances by weights', t => {
  const withdrawal = amt(0n);
  const current = {
    USDN: amt(500n),
    Aave_Arbitrum: amt(300n),
  };
  const allocation: TargetAllocation = {
    USDN: 50n,
    Aave_Arbitrum: 50n,
  };

  const res = withdrawTargetsFromAllocation(withdrawal, current, allocation);
  // Total 800 splits to 400/400; both differ from current so both included
  t.deepEqual(res, {
    USDN: amt(400n),
    Aave_Arbitrum: amt(400n),
    '<Cash>': amt(0n),
  } as const);
});

// 7) Zero weight sum should throw
// (All weights 0n)
test('withdrawTargetsFromAllocation - throws on zero weight sum', t => {
  const withdrawal = amt(0n);
  const current = {};
  const allocation: TargetAllocation = { USDN: 0n };

  t.throws(
    () => withdrawTargetsFromAllocation(withdrawal, current, allocation),
    {
      message: /allocation weights must sum > 0/,
    },
  );
});

// 8) Invalid weight type at runtime should throw (non-bigint passed via any)
test('withdrawTargetsFromAllocation - throws on non-Nat weight', t => {
  const withdrawal = amt(100n);
  const current = { USDN: amt(500n) };
  const allocation = { USDN: 'not-a-bigint' } as any as TargetAllocation;

  t.throws(
    () => withdrawTargetsFromAllocation(withdrawal, current, allocation),
    {
      message: /allocation weight must be a Nat/,
    },
  );
});

// 9) Missing pool in current is treated as 0 and still allocated proportionally
// Current: USDN 500, (Aave missing); Withdraw: 200; Alloc: USDN 60, Aave 40
// Total in alloc keys present = 500 -> total 300 -> USDN 180, Aave 120
test('withdrawTargetsFromAllocation - missing current key handled', t => {
  const withdrawal = amt(200n);
  const current = { USDN: amt(500n) };
  const allocation: TargetAllocation = { USDN: 60n, Aave_Arbitrum: 40n };

  const res = withdrawTargetsFromAllocation(withdrawal, current, allocation);
  t.deepEqual(res, {
    USDN: amt(180n),
    Aave_Arbitrum: amt(120n),
    '<Cash>': amt(200n),
  } as const);
});
