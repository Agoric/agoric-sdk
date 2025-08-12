import test from 'ava';
import { AmountMath } from '@agoric/ertp';
import { rebalanceMinCostFlow } from '../src/rebalance.js';
import type { Transfer } from '../src/rebalance.js';
import type { Amount, Brand } from '@agoric/ertp/src/types.js';
import { Far } from '@endo/marshal';

/**
 * Fake for testing
 */
const makeIssuerKit = (name: string) => {
  return { brand: Far(name) as Brand };
};

const { brand } = makeIssuerKit('TestToken');
const tokens = (value: bigint): Amount => AmountMath.make(brand, value);
const zero = AmountMath.makeEmpty(brand);

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
  const current = {
    A: AmountMath.make(brand, 80n),
    B: tokens(20n),
  };
  const target = { A: 0.5, B: 0.5 };
  const transfers = rebalanceMinCostFlow(current, target, brand);

  t.deepEqual(transfers, [{ from: 'A', to: 'B', amount: tokens(30n) }]);

  const final = applyTransfers(current, transfers, brand);
  t.is(final.A.value, 50n);
  t.is(final.B.value, 50n);
});

test('rebalanceMinCostFlow: 3-pool rounding', t => {
  const current = {
    A: tokens(100n),
    B: zero,
    C: zero,
  };
  const target = { A: 0.34, B: 0.33, C: 0.33 };
  const transfers = rebalanceMinCostFlow(current, target, brand);

  t.deepEqual(transfers, [
    { from: 'A', to: 'B', amount: tokens(33n) },
    { from: 'A', to: 'C', amount: tokens(33n) },
  ]);

  const final = applyTransfers(current, transfers, brand);

  const total = Object.values(final).reduce(
    (sum, amount) => AmountMath.add(sum, amount),
    zero,
  );
  t.is(total.value, 100n);

  // All pools should be close to their targ`q  `ets
  t.true(Math.abs(Number(final.A.value) - 34) <= 1);
  t.true(Math.abs(Number(final.B.value) - 33) <= 1);
  t.true(Math.abs(Number(final.C.value) - 33) <= 1);
});

test('rebalanceMinCostFlow: already balanced', t => {
  const current = {
    A: tokens(50n),
    B: tokens(50n),
  };
  const target = { A: 0.5, B: 0.5 };
  const transfers = rebalanceMinCostFlow(current, target, brand);

  t.deepEqual(transfers, []);
});

test('rebalanceMinCostFlow: all to one', t => {
  const current = {
    A: tokens(10n),
    B: tokens(20n),
    C: tokens(70n),
  };
  const target = { A: 1, B: 0, C: 0 };
  const transfers = rebalanceMinCostFlow(current, target, brand);

  t.deepEqual(transfers, [
    { from: 'C', to: 'A', amount: tokens(70n) },
    { from: 'B', to: 'A', amount: tokens(20n) },
  ]);

  const final = applyTransfers(current, transfers, brand);

  t.is(final.A.value, 100n);
  t.is(final.B.value, 0n);
  t.is(final.C.value, 0n);
});

test('rebalanceMinCostFlow: distribute from one pool to others', t => {
  const current = {
    A: tokens(100n),
    B: zero,
    C: zero,
  };
  const target = { A: 0, B: 0.6, C: 0.4 };
  const transfers = rebalanceMinCostFlow(current, target, brand);

  t.deepEqual(transfers, [
    { from: 'A', to: 'B', amount: tokens(60n) },
    { from: 'A', to: 'C', amount: tokens(40n) },
  ]);

  const final = applyTransfers(current, transfers, brand);

  t.is(final.A.value, 0n);
  t.is(final.B.value, 60n);
  t.is(final.C.value, 40n);
});

test('rebalanceMinCostFlow: collect from multiple pools to one', t => {
  const current = {
    A: zero,
    B: tokens(30n),
    C: tokens(70n),
  };
  const target = { A: 1, B: 0, C: 0 };
  const transfers = rebalanceMinCostFlow(current, target, brand);

  t.deepEqual(transfers, [
    { from: 'C', to: 'A', amount: tokens(70n) },
    { from: 'B', to: 'A', amount: tokens(30n) },
  ]);

  const final = applyTransfers(current, transfers, brand);

  t.is(final.A.value, 100n);
  t.is(final.B.value, 0n);
  t.is(final.C.value, 0n);
});
