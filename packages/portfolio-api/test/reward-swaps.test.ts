import test from 'ava';

import {
  getMinAmountOutForSlippage,
  MAX_REWARD_SWAP_SLIPPAGE_BPS,
} from '../src/reward-swaps.ts';
import { runWithoutLockdown } from './without-lockdown.ts';

test('the reward swap slippage cap is 2%', t => {
  t.is(MAX_REWARD_SWAP_SLIPPAGE_BPS, 200);
});

test('minimum output rounds up so the tolerance is never exceeded', t => {
  for (const [quoted, bps, expected] of [
    [3_000_000n, 200, 2_940_000n],
    [3_000_001n, 200, 2_940_001n], // 2_940_000.98 rounds up
    [1n, 200, 1n],
    [0n, 200, 0n],
    [3_000_000n, 0, 3_000_000n],
    [3_000_000n, 10_000, 0n],
    [2n ** 255n, 1, (2n ** 255n * 9_999n + 9_999n) / 10_000n],
  ] as const) {
    t.is(getMinAmountOutForSlippage(quoted, bps), expected, `${quoted} ${bps}`);
  }
  // Exactly at the minimum is within tolerance; one below is not.
  const quoted = 123_456_789n;
  const min = getMinAmountOutForSlippage(quoted, MAX_REWARD_SWAP_SLIPPAGE_BPS);
  t.true(min * 10_000n >= quoted * 9_800n);
  t.true((min - 1n) * 10_000n < quoted * 9_800n);
});

test('minimum output rejects invalid inputs', t => {
  for (const [quoted, bps] of [
    [-1n, 200],
    [1, 200],
    [1n, -1],
    [1n, 10_001],
    [1n, 1.5],
    [1n, 200n],
  ]) {
    t.throws(() => getMinAmountOutForSlippage(quoted as any, bps as any), {
      instanceOf: RangeError,
    });
  }
});

test('usable without lockdown', async t => {
  const script = `
    const m = await import('@agoric/portfolio-api/src/reward-swaps.js');
    if (m.getMinAmountOutForSlippage(100n, m.MAX_REWARD_SWAP_SLIPPAGE_BPS) !== 98n) {
      throw Error('unexpected minimum');
    }
  `;
  await t.notThrowsAsync(runWithoutLockdown(script));
});
