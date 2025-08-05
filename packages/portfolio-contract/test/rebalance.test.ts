import test from 'ava';
import { rebalanceMinCostFlow } from '../src/rebalance.js';
import type { Transfer } from '../src/rebalance.js';

/**
 * Helper to sum balances after transfers.
 */
function applyTransfers(
  balances: Record<string, number>,
  transfers: Transfer[],
): Record<string, number> {
  const result = { ...balances };
  for (const { from, to, amount } of transfers) {
    result[from] -= amount;
    result[to] += amount;
  }
  return result;
}

test('rebalanceMinCostFlow: simple 2-pool case', t => {
  const current = { A: 80, B: 20 };
  const target = { A: 0.5, B: 0.5 };
  const transfers = rebalanceMinCostFlow(current, target);

  t.deepEqual(transfers, [{ from: 'A', to: 'B', amount: 30 }]);
  const final = applyTransfers(current, transfers);
  t.true(Math.abs(final.A - 50) < 1e-6);
  t.true(Math.abs(final.B - 50) < 1e-6);
});

test('rebalanceMinCostFlow: 3-pool rounding', t => {
  const current = { A: 100, B: 0, C: 0 };
  const target = { A: 0.34, B: 0.33, C: 0.33 };
  const transfers = rebalanceMinCostFlow(current, target);
  const final = applyTransfers(current, transfers);

  const total = Object.values(final).reduce((a, b) => a + b, 0);
  t.is(Math.round(total), 100);

  // All pools should be close to their targets
  t.true(Math.abs(final.A - 34) <= 1);
  t.true(Math.abs(final.B - 33) <= 1);
  t.true(Math.abs(final.C - 33) <= 1);
});

test('rebalanceMinCostFlow: already balanced', t => {
  const current = { A: 50, B: 50 };
  const target = { A: 0.5, B: 0.5 };
  const transfers = rebalanceMinCostFlow(current, target);
  t.deepEqual(transfers, []);
});

test('rebalanceMinCostFlow: all to one', t => {
  const current = { A: 10, B: 20, C: 70 };
  const target = { A: 1, B: 0, C: 0 };
  const transfers = rebalanceMinCostFlow(current, target);
  const final = applyTransfers(current, transfers);

  t.is(final.A, 100);
  t.is(final.B, 0);
});
