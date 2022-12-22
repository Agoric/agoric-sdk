// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { AmountMath } from '@agoric/ertp';

import { calcDeltaXSellingX } from '../../../src/vpool-xyk-amm/constantProduct/core.js';
import { setupMintKits } from './setupMints.js';

const doTest = (t, x, y, deltaY, expectedDeltaX) => {
  const { run, bld } = setupMintKits();
  const result = calcDeltaXSellingX(run(x), bld(y), bld(deltaY));
  t.true(
    AmountMath.isEqual(result, run(expectedDeltaX)),
    `${result.value} should equal ${expectedDeltaX}`,
  );
};

test('0, 0, 0, 0', t => {
  t.throws(() => doTest(t, 0n, 0n, 0n, 0n), {
    message: 'No infinite ratios! Denominator was 0 "[Alleged: BLD brand]"',
  });
});

test('0, 0, 1, 0', t => {
  t.throws(() => doTest(t, 0n, 0n, 1n, 0n), {
    message: '-1 is negative',
  });
});

test('1, 0, 0, 0', t => {
  t.throws(() => doTest(t, 1n, 0n, 0n, 0n), {
    message: 'No infinite ratios! Denominator was 0 "[Alleged: BLD brand]"',
  });
});

test('0, 1, 0, 0', t => {
  doTest(t, 0n, 1n, 0n, 0n);
});

test('1, 1, 0, 0', t => {
  doTest(t, 1n, 1n, 0n, 0n);
});

test('1, 1, 1, 0', t => {
  t.throws(() => doTest(t, 1n, 1n, 1n, 0n), {
    message: 'No infinite ratios! Denominator was 0 "[Alleged: BLD brand]"',
  });
});

test('1, 2, 1, 1', t => {
  doTest(t, 1n, 2n, 1n, 1n);
});

test('2, 3, 1, 1', t => {
  doTest(t, 2n, 3n, 1n, 1n);
});

test('928861206, 130870247, 746353662, 158115257', t => {
  doTest(t, 928_861_206n, 5_130_870_247n, 746_353_662n, 1_581_152_57n);
});

test('9, 17, 3, 2', t => {
  doTest(t, 9n, 17n, 3n, 2n);
});

test('10000, 5000, 209, 437', t => {
  doTest(t, 10000n, 5000n, 209n, 437n);
});

test('1000000, 5000, 209, 1', t => {
  doTest(t, 1_000_000n, 5000n, 209n, 43624n);
});

test('5000, 1000000, 209, 2', t => {
  doTest(t, 5000n, 1000000n, 209n, 2n);
});

test('500_000, 1000_000, 209 or 210', t => {
  doTest(t, 500_000n, 1000_000n, 209n, 105n);
  doTest(t, 500_000n, 1000_000n, 210n, 106n);
});
