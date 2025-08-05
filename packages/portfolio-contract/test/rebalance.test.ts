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
  const target = { A: 0.5, B: 0.5 };
  const transfers = rebalanceMinCostFlow(current, target, brand);

  t.is(transfers.length, 1);
  t.is(transfers[0].from, 'A');
  t.is(transfers[0].to, 'B');
  t.is(transfers[0].amount.value, 30n);

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
  const target = { A: 0.34, B: 0.33, C: 0.33 };
  const transfers = rebalanceMinCostFlow(current, target, brand);
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
  const target = { A: 0.5, B: 0.5 };
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
  const target = { A: 1, B: 0, C: 0 };
  const transfers = rebalanceMinCostFlow(current, target, brand);
  const final = applyTransfers(current, transfers, brand);

  t.is(final.A.value, 100n);
  t.is(final.B.value, 0n);
  t.is(final.C.value, 0n);
});
