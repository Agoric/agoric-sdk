import test from 'ava';
import { AmountMath, type Brand } from '@agoric/ertp';
import { Far } from '@endo/pass-style';
import type { TargetAllocation } from '@aglocal/portfolio-contract/src/type-guards.js';
import { planDepositTransfers } from '../src/plan-transfers.js';
import { makeTracer } from '@agoric/internal';

const brand = Far('mock brand') as Brand<'nat'>;
const trace = makeTracer('planDepositTransfers');

test('planDepositTransfers works in a handful of cases', t => {
  const make = value => AmountMath.make(brand, value);

  trace('Test case 1: Empty current balances, equal target allocation');
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
    Aave_Arbitrum: make(300n),
    Compound_Arbitrum: make(200n),
  });

  trace('Test case 2: Existing balances, need rebalancing');
  const deposit2 = make(500n);
  const currentBalances2 = {
    USDN: make(200n),
    Aave_Arbitrum: make(100n),
    Compound_Arbitrum: make(0n),
  };
  const targetAllocation2: TargetAllocation = {
    USDN: 40n,
    Aave_Arbitrum: 40n,
    Compound_Arbitrum: 20n,
  };

  const result2 = planDepositTransfers(
    deposit2,
    currentBalances2,
    targetAllocation2,
  );
  trace({ deposit2, targetAllocation2, result2 });
  // Total after deposit: 300 + 500 = 800
  // Targets: USDN=320, Aave=320, Compound=160
  // Transfers needed: USDN=120, Aave=220, Compound=160
  t.deepEqual(result2, {
    USDN: make(120n),
    Aave_Arbitrum: make(220n),
    Compound_Arbitrum: make(160n),
  });

  // Test case 3: Some positions already over-allocated
  const deposit3 = make(300n);
  const currentBalances3 = {
    USDN: make(600n), // already over target
    Aave_Arbitrum: make(100n),
    Compound_Arbitrum: make(50n),
  };
  const targetAllocation3: TargetAllocation = {
    USDN: 50n,
    Aave_Arbitrum: 30n,
    Compound_Arbitrum: 20n,
  };

  const result3 = planDepositTransfers(
    deposit3,
    currentBalances3,
    targetAllocation3,
  );
  trace({ currentBalances3, deposit3, targetAllocation3, result3 });

  // Total after deposit: 750 + 300 = 1050
  // Targets: USDN=525, Aave=315, Compound=210
  // USDN is already over target (600 > 525), so no transfer
  // Need transfers: Aave=215, Compound=160, total=375
  // But deposit is only 300, so scale down proportionally:
  // Aave: 215 * (300/375) = 172, Compound: 160 * (300/375) = 128
  t.deepEqual(result3, {
    Aave_Arbitrum: make(172n),
    Compound_Arbitrum: make(128n),
  });

  // Test case 4: Transfer amounts exceed deposit (scaling needed)
  const deposit4 = make(100n);
  const currentBalances4 = {
    USDN: make(0n),
    Aave_Arbitrum: make(0n),
    Compound_Arbitrum: make(0n),
  };
  const targetAllocation4: TargetAllocation = {
    USDN: 60n,
    Aave_Arbitrum: 30n,
    Compound_Arbitrum: 10n,
  };

  const result4 = planDepositTransfers(
    deposit4,
    currentBalances4,
    targetAllocation4,
  );

  // Should allocate proportionally to the 100 deposit
  t.deepEqual(result4, {
    USDN: make(60n),
    Aave_Arbitrum: make(30n),
    Compound_Arbitrum: make(10n),
  });

  // Test case 5: Single position target
  const deposit5 = make(1000n);
  const currentBalances5 = { USDN: make(500n) };
  const targetAllocation5: TargetAllocation = { USDN: 100n };

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
