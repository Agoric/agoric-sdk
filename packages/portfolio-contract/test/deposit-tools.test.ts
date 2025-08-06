/** @file test for deposit tools */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { AmountMath } from '@agoric/ertp';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { planDepositTransfers } from '../tools/portfolio-actors.js';
import { makeIssuerKit } from '@agoric/ertp';
import type { TargetAllocation } from '../src/type-guards.js';

const { brand } = makeIssuerKit('USDC');

test('planDepositTransfers works in a handful of cases', t => {
  const make = value => AmountMath.make(brand, value);

  // Test case 1: Empty current balances, equal target allocation
  const deposit1 = make(1000n);
  const currentBalances1 = {};
  const targetAllocation1: TargetAllocation = {
    USDN: 50n,
    Aave_Arbitrum: 30n,
    Compound_Arbitrum: 20n,
  };

  const result1 = planDepositTransfers(
    deposit1,
    currentBalances1,
    targetAllocation1,
  );

  t.deepEqual(result1, {
    USDN: make(500n),
    Aave: make(300n),
    Compound: make(200n),
  });

  // Test case 2: Existing balances, need rebalancing
  const deposit2 = make(500n);
  const currentBalances2 = {
    USDN: make(200n),
    Aave: make(100n),
    Compound: make(0n),
  };
  const targetAllocation2 = { USDN: 40, Aave: 40, Compound: 20 };

  const result2 = planDepositTransfers(
    deposit2,
    currentBalances2,
    targetAllocation2,
  );

  // Total after deposit: 300 + 500 = 800
  // Targets: USDN=320, Aave=320, Compound=160
  // Transfers needed: USDN=120, Aave=220, Compound=160
  t.deepEqual(result2, {
    USDN: make(120n),
    Aave: make(220n),
    Compound: make(160n),
  });

  // Test case 3: Some positions already over-allocated
  const deposit3 = make(300n);
  const currentBalances3 = {
    USDN: make(600n), // already over target
    Aave: make(100n),
    Compound: make(50n),
  };
  const targetAllocation3 = { USDN: 50, Aave: 30, Compound: 20 };

  const result3 = planDepositTransfers(
    deposit3,
    currentBalances3,
    targetAllocation3,
  );

  // Total after deposit: 750 + 300 = 1050
  // Targets: USDN=525, Aave=315, Compound=210
  // USDN is already over target (600 > 525), so no transfer
  // Only transfer to under-allocated positions
  t.deepEqual(result3, {
    Aave: make(215n),
    Compound: make(160n),
  });

  // Test case 4: Transfer amounts exceed deposit (scaling needed)
  const deposit4 = make(100n);
  const currentBalances4 = {
    USDN: make(0n),
    Aave: make(0n),
    Compound: make(0n),
  };
  const targetAllocation4 = { USDN: 60, Aave: 30, Compound: 10 };

  const result4 = planDepositTransfers(
    deposit4,
    currentBalances4,
    targetAllocation4,
  );

  // Should allocate proportionally to the 100 deposit
  t.deepEqual(result4, {
    USDN: make(60n),
    Aave: make(30n),
    Compound: make(10n),
  });

  // Test case 5: Single position target
  const deposit5 = make(1000n);
  const currentBalances5 = { USDN: make(500n) };
  const targetAllocation5 = { USDN: 100 };

  const result5 = planDepositTransfers(
    deposit5,
    currentBalances5,
    targetAllocation5,
  );

  // Total after: 1500, target: 1500, current: 500, transfer: 1000
  t.deepEqual(result5, {
    USDN: make(1000n),
  });
});
