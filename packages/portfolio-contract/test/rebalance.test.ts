import test from 'ava';
import { AmountMath } from '@agoric/ertp';
import { rebalanceMinCostFlow } from '../tools/rebalance.ts';
import type { Transfer } from '../tools/rebalance.ts';
import type { Amount, Brand } from '@agoric/ertp/src/types.js';
import { Far } from '@endo/marshal';
import { planTransferPath } from '../tools/portfolio-actors.ts';

/**
 * Fake for testing
 */
const makeIssuerKit = (name: string) => {
  return { brand: Far(name) as Brand };
};

/**
 * Helper to sum balances after transfers.
 */
function applyTransfers(
  balances: Record<string, Amount>,
  transfers: Transfer[],
  brand: Brand,
): Record<string, Amount> {
  const result = { ...balances };
  for (const { from, to, amount } of transfers) {
    result[from] = AmountMath.subtract(result[from], amount);
    result[to] = AmountMath.add(result[to], amount);
  }
  return result;
}

test('rebalanceMinCostFlow: simple 2-pool case', t => {
  const { brand } = makeIssuerKit('TestToken');
  const current = {
    A: AmountMath.make(brand, 80n),
    B: AmountMath.make(brand, 20n),
  };
  const target = { A: 5000n, B: 5000n };
  const transfers = rebalanceMinCostFlow(current, target, brand);

  t.deepEqual(transfers, [
    { from: 'A', to: 'B', amount: AmountMath.make(brand, 30n) },
  ]);

  const final = applyTransfers(current, transfers, brand);
  t.is(final.A.value, 50n);
  t.is(final.B.value, 50n);
});

test('rebalanceMinCostFlow: 3-pool rounding', t => {
  const { brand } = makeIssuerKit('TestToken');
  const current = {
    A: AmountMath.make(brand, 100n),
    B: AmountMath.makeEmpty(brand),
    C: AmountMath.makeEmpty(brand),
  };
  const target = { A: 3400n, B: 3300n, C: 3300n };
  const transfers = rebalanceMinCostFlow(current, target, brand);

  t.deepEqual(transfers, [
    { from: 'A', to: 'B', amount: AmountMath.make(brand, 33n) },
    { from: 'A', to: 'C', amount: AmountMath.make(brand, 33n) },
  ]);

  const final = applyTransfers(current, transfers, brand);

  const total = Object.values(final).reduce(
    (sum, amount) => AmountMath.add(sum, amount),
    AmountMath.makeEmpty(brand),
  );
  t.is(total.value, 100n);

  // All pools should be close to their targets
  t.true(Math.abs(Number(final.A.value) - 34) <= 1);
  t.true(Math.abs(Number(final.B.value) - 33) <= 1);
  t.true(Math.abs(Number(final.C.value) - 33) <= 1);
});

test('rebalanceMinCostFlow: already balanced', t => {
  const { brand } = makeIssuerKit('TestToken');
  const current = {
    A: AmountMath.make(brand, 50n),
    B: AmountMath.make(brand, 50n),
  };
  const target = { A: 5000n, B: 5000n };
  const transfers = rebalanceMinCostFlow(current, target, brand);

  t.deepEqual(transfers, []);
});

test('rebalanceMinCostFlow: all to one', t => {
  const { brand } = makeIssuerKit('TestToken');
  const current = {
    A: AmountMath.make(brand, 10n),
    B: AmountMath.make(brand, 20n),
    C: AmountMath.make(brand, 70n),
  };
  const target = { A: 10000n, B: 0n, C: 0n };
  const transfers = rebalanceMinCostFlow(current, target, brand);

  t.deepEqual(transfers, [
    { from: 'C', to: 'A', amount: AmountMath.make(brand, 70n) },
    { from: 'B', to: 'A', amount: AmountMath.make(brand, 20n) },
  ]);

  const final = applyTransfers(current, transfers, brand);

  t.is(final.A.value, 100n);
  t.is(final.B.value, 0n);
  t.is(final.C.value, 0n);
});

test('rebalanceMinCostFlow: distribute from one pool to others', t => {
  const { brand } = makeIssuerKit('TestToken');
  const current = {
    A: AmountMath.make(brand, 100n),
    B: AmountMath.makeEmpty(brand),
    C: AmountMath.makeEmpty(brand),
  };
  const target = { A: 0n, B: 6000n, C: 4000n };
  const transfers = rebalanceMinCostFlow(current, target, brand);

  t.deepEqual(transfers, [
    { from: 'A', to: 'B', amount: AmountMath.make(brand, 60n) },
    { from: 'A', to: 'C', amount: AmountMath.make(brand, 40n) },
  ]);

  const final = applyTransfers(current, transfers, brand);

  t.is(final.A.value, 0n);
  t.is(final.B.value, 60n);
  t.is(final.C.value, 40n);
});

test('rebalanceMinCostFlow: collect from multiple pools to one', t => {
  const { brand } = makeIssuerKit('TestToken');
  const current = {
    A: AmountMath.makeEmpty(brand),
    B: AmountMath.make(brand, 30n),
    C: AmountMath.make(brand, 70n),
  };
  const target = { A: 10000n, B: 0n, C: 0n };
  const transfers = rebalanceMinCostFlow(current, target, brand);

  t.deepEqual(transfers, [
    { from: 'C', to: 'A', amount: AmountMath.make(brand, 70n) },
    { from: 'B', to: 'A', amount: AmountMath.make(brand, 30n) },
  ]);

  const final = applyTransfers(current, transfers, brand);

  t.is(final.A.value, 100n);
  t.is(final.B.value, 0n);
  t.is(final.C.value, 0n);
});

test('planTransferPath happy path test', t => {
  const { brand } = makeIssuerKit('USDC');
  const make = (value: bigint) => AmountMath.make(brand, value);

  // Test 1: USDN to Aave_Arbitrum
  const amount1 = make(1000n);
  const path1 = planTransferPath('USDN', 'Aave_Arbitrum', amount1);

  t.deepEqual(path1, [
    { dest: '@noble', src: 'USDNVault', amount: amount1 },
    { src: '@noble', dest: '@Arbitrum', amount: amount1 },
    { src: '@Arbitrum', dest: 'Aave_Arbitrum', amount: amount1 },
  ]);

  // Test 2: Aave_Arbitrum to USDN
  const amount2 = make(500n);
  const path2 = planTransferPath('Aave_Arbitrum', 'USDN', amount2);

  t.deepEqual(path2, [
    { src: 'Aave_Arbitrum', dest: '@Arbitrum', amount: amount2 },
    { src: '@Arbitrum', dest: '@noble', amount: amount2 },
    {
      src: '@noble',
      dest: 'USDNVault',
      amount: amount2,
      detail: { usdnOut: (amount2.value * 99n) / 100n },
    },
  ]);

  // Test 3: Compound_Arbitrum to Aave_Arbitrum (both on same chain)
  const amount3 = make(750n);
  const path3 = planTransferPath('Compound_Arbitrum', 'Aave_Arbitrum', amount3);

  t.deepEqual(path3, [
    { src: 'Compound_Arbitrum', dest: '@Arbitrum', amount: amount3 },
    { src: '@Arbitrum', dest: '@noble', amount: amount3 },
    { src: '@noble', dest: '@Arbitrum', amount: amount3 },
    { src: '@Arbitrum', dest: 'Aave_Arbitrum', amount: amount3 },
  ]);

  // Test 4: USDN to USDN (should still go through the vault)
  const amount4 = make(200n);
  const path4 = planTransferPath('USDN', 'USDN', amount4);

  t.deepEqual(path4, [
    { dest: '@noble', src: 'USDNVault', amount: amount4 },
    {
      src: '@noble',
      dest: 'USDNVault',
      amount: amount4,
      detail: { usdnOut: (amount4.value * 99n) / 100n },
    },
  ]);
});

test('planTransferPath edge cases: same pool transfer', t => {
  const { brand } = makeIssuerKit('USDC');
  const make = (value: bigint) => AmountMath.make(brand, value);

  // Test: USDN to USDN (round trip through vault)
  const amount = make(1000n);
  const path = planTransferPath('USDN', 'USDN', amount);

  // if the assets are already there, an empty path is in order. AI!
  t.deepEqual(path, []);
});

test('planTransferPath edge cases: cross-chain EVM transfers', t => {
  const { brand } = makeIssuerKit('USDC');
  const make = (value: bigint) => AmountMath.make(brand, value);

  // Test: Aave_Arbitrum to Compound_Arbitrum (same chain)
  const amount1 = make(500n);
  const path1 = planTransferPath('Aave_Arbitrum', 'Compound_Arbitrum', amount1);

  t.deepEqual(path1, [
    { src: 'Aave_Arbitrum', dest: '@Arbitrum', amount: amount1 },
    { src: '@Arbitrum', dest: '@noble', amount: amount1 },
    { src: '@noble', dest: '@Arbitrum', amount: amount1 },
    { src: '@Arbitrum', dest: 'Compound_Arbitrum', amount: amount1 },
  ]);

  // Test: Different chains - Aave_Arbitrum to Compound_Polygon
  const amount2 = make(750n);
  const path2 = planTransferPath('Aave_Arbitrum', 'Compound_Polygon', amount2);

  t.deepEqual(path2, [
    { src: 'Aave_Arbitrum', dest: '@Arbitrum', amount: amount2 },
    { src: '@Arbitrum', dest: '@noble', amount: amount2 },
    { src: '@noble', dest: '@Polygon', amount: amount2 },
    { src: '@Polygon', dest: 'Compound_Polygon', amount: amount2 },
  ]);
});

test('planTransferPath edge cases: zero amounts', t => {
  const { brand } = makeIssuerKit('USDC');
  const make = (value: bigint) => AmountMath.make(brand, value);

  // Test: Zero amount transfer
  const zeroAmount = make(0n);
  const path = planTransferPath('USDN', 'Aave_Arbitrum', zeroAmount);

  t.deepEqual(path, [
    { dest: '@noble', src: 'USDNVault', amount: zeroAmount },
    { src: '@noble', dest: '@Arbitrum', amount: zeroAmount },
    { src: '@Arbitrum', dest: 'Aave_Arbitrum', amount: zeroAmount },
  ]);
});

test('planTransferPath edge cases: large amounts', t => {
  const { brand } = makeIssuerKit('USDC');
  const make = (value: bigint) => AmountMath.make(brand, value);

  // Test: Very large amount
  const largeAmount = make(1000000000000n); // 1 trillion
  const path = planTransferPath('Compound_Arbitrum', 'USDN', largeAmount);

  t.deepEqual(path, [
    { src: 'Compound_Arbitrum', dest: '@Arbitrum', amount: largeAmount },
    { src: '@Arbitrum', dest: '@noble', amount: largeAmount },
    {
      src: '@noble',
      dest: 'USDNVault',
      amount: largeAmount,
      detail: { usdnOut: (largeAmount.value * 99n) / 100n },
    },
  ]);
});

test('planTransferPath edge cases: all protocol combinations', t => {
  const { brand } = makeIssuerKit('USDC');
  const make = (value: bigint) => AmountMath.make(brand, value);
  const amount = make(100n);

  // Test all possible source-destination combinations
  const protocols = ['USDN', 'Aave_Arbitrum', 'Compound_Arbitrum'] as const;

  for (const src of protocols) {
    for (const dest of protocols) {
      if (src === dest) continue; // Skip same-to-same (tested separately)

      const path = planTransferPath(src, dest, amount);

      // Verify path structure
      t.true(
        Array.isArray(path),
        `Path for ${src} -> ${dest} should be an array`,
      );
      t.true(path.length > 0, `Path for ${src} -> ${dest} should not be empty`);

      // Verify all steps have required properties
      for (const step of path) {
        t.true('amount' in step, 'Each step should have amount');
        t.true(
          ('src' in step && 'dest' in step) ||
            ('dest' in step && 'src' in step),
          'Each step should have src/dest',
        );
        t.deepEqual(
          step.amount,
          amount,
          'Amount should be preserved through all steps',
        );
      }

      // Verify path continuity (each step's dest should match next step's src)
      for (let i = 0; i < path.length - 1; i++) {
        const currentStep = path[i];
        const nextStep = path[i + 1];
        if ('dest' in currentStep && 'src' in nextStep) {
          t.is(
            currentStep.dest,
            nextStep.src,
            `Step ${i} dest should match step ${i + 1} src`,
          );
        }
      }
    }
  }
});

test('planTransferPath edge cases: USDN exchange rate calculation', t => {
  const { brand } = makeIssuerKit('USDC');
  const make = (value: bigint) => AmountMath.make(brand, value);

  // Test various amounts to verify 99% exchange rate
  const testAmounts = [1n, 100n, 1000n, 999n, 1001n];

  for (const value of testAmounts) {
    const amount = make(value);
    const path = planTransferPath('Aave_Arbitrum', 'USDN', amount);

    const usdnStep = path.find(
      step => 'dest' in step && step.dest === 'USDNVault',
    );
    t.truthy(usdnStep, 'Should have USDN vault step');
    t.truthy(usdnStep?.detail, 'USDN step should have detail');

    if (usdnStep?.detail && 'usdnOut' in usdnStep.detail) {
      const expectedOut = (value * 99n) / 100n;
      t.is(
        usdnStep.detail.usdnOut,
        expectedOut,
        `USDN output should be 99% of ${value}`,
      );
    }
  }
});

test('planTransferPath edge cases: path optimization opportunities', t => {
  const { brand } = makeIssuerKit('USDC');
  const make = (value: bigint) => AmountMath.make(brand, value);
  const amount = make(1000n);

  // Test that same-chain transfers still go through Noble (not optimized)
  const samechainPath = planTransferPath(
    'Aave_Arbitrum',
    'Compound_Arbitrum',
    amount,
  );

  // Should include Noble as intermediary even though both are on Arbitrum
  const hasNobleStep = samechainPath.some(
    step =>
      ('src' in step && step.src === '@noble') ||
      ('dest' in step && step.dest === '@noble'),
  );
  t.true(hasNobleStep, 'Same-chain transfers should still route through Noble');

  // Should have exactly 4 steps: pool->chain, chain->noble, noble->chain, chain->pool
  t.is(samechainPath.length, 4, 'Same-chain transfer should have 4 steps');
});

test('planTransferPath edge cases: step ordering and structure', t => {
  const { brand } = makeIssuerKit('USDC');
  const make = (value: bigint) => AmountMath.make(brand, value);
  const amount = make(500n);

  // Test USDN -> EVM path structure
  const usdnToEvmPath = planTransferPath('USDN', 'Aave_Arbitrum', amount);

  // First step should be from USDN vault
  t.is(usdnToEvmPath[0].src, 'USDNVault');
  t.is(usdnToEvmPath[0].dest, '@noble');

  // Last step should be to Aave pool
  const lastStep = usdnToEvmPath[usdnToEvmPath.length - 1];
  t.is(lastStep.dest, 'Aave_Arbitrum');
  t.is(lastStep.src, '@Arbitrum');

  // Test EVM -> USDN path structure
  const evmToUsdnPath = planTransferPath('Compound_Arbitrum', 'USDN', amount);

  // First step should be from Compound pool
  t.is(evmToUsdnPath[0].src, 'Compound_Arbitrum');
  t.is(evmToUsdnPath[0].dest, '@Arbitrum');

  // Last step should be to USDN vault with detail
  const lastUsdnStep = evmToUsdnPath[evmToUsdnPath.length - 1];
  t.is(lastUsdnStep.dest, 'USDNVault');
  t.is(lastUsdnStep.src, '@noble');
  t.truthy(lastUsdnStep.detail);
});
