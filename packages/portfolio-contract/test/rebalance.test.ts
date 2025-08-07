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

// a page or so of planTransferPath edge case tests AI!
