// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { calcLiqValueAnyRatio } from '../../../../src/contracts/vpool-xyk-amm/addLiquidity.js';

test('pool initialized', t => {
  t.throws(() => calcLiqValueAnyRatio(20n, 0n, 20n, 11n, 15n), {
    message: 'Pool must already be initialized.',
  });
  t.throws(() => calcLiqValueAnyRatio(20n, 30n, 0n, 11n, 15n), {
    message: 'Pool must already be initialized.',
  });
});

test('double the liquidity', t => {
  t.is(calcLiqValueAnyRatio(20n, 30n, 20n, 30n, 20n), 20n);
  t.is(calcLiqValueAnyRatio(1000n, 3000n, 2000n, 3000n, 2000n), 1000n);
});

test('change the ratio', t => {
  // sqrt(3000^2 * 53k * 24K / (3k * 4k)) - 3000
  t.is(calcLiqValueAnyRatio(3000n, 3000n, 4000n, 50000n, 20000n), 27886n);
  // sqrt(3000^2 * 400k * 300k / (3k * 4k))  - 3000
  t.is(
    calcLiqValueAnyRatio(3000n, 3000n, 4000n, 397_000n, 296_000n),
    300000n - 3000n,
  );

  // same thing in reverse order
  t.is(calcLiqValueAnyRatio(397_000n, 397_000n, 296_000n, 3000n, 4000n), 4180n);
});

test('add just one currency', t => {
  // sqrt(3000^2 * 3k * 24K / (3k * 4k)) - 3000
  t.is(calcLiqValueAnyRatio(3000n, 3000n, 4000n, 0n, 20000n), 4348n);
  // sqrt(3000^2 * 400k * 4k / (3k * 4k)) - 3000
  t.is(calcLiqValueAnyRatio(3000n, 3000n, 4000n, 397_000n, 0n), 31641n);
});
