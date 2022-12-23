// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { AmountMath } from '@agoric/ertp';

import { calcDeltaYSellingX } from '../../../src/vpool-xyk-amm/constantProduct/core.js';
import { setupMintKits } from './setupMints.js';

const doTest = (t, x, y, deltaX, expectedDeltaY) => {
  const { run, bld } = setupMintKits();
  const result = calcDeltaYSellingX(run(x), bld(y), run(deltaX));
  t.true(
    AmountMath.isEqual(result, bld(expectedDeltaY)),
    `${result.value} equals ${expectedDeltaY}`,
  );
};

// deltaXPlusX is 0
test('0, 0, 0, 0', t => {
  t.throws(() => doTest(t, 0n, 0n, 0n, 0n), {
    message: 'No infinite ratios! Denominator was 0 "[Alleged: RUN brand]"',
  });
});

test('0, 0, 1, 0', t => {
  doTest(t, 0n, 0n, 1n, 0n);
});

test('1, 0, 0, 0', t => {
  doTest(t, 1n, 0n, 0n, 0n);
});

// deltaXPlusX is 0
test('0, 1, 0, 0', t => {
  t.throws(() => doTest(t, 0n, 1n, 0n, 0n), {
    message: 'No infinite ratios! Denominator was 0 "[Alleged: RUN brand]"',
  });
});

test('1, 1, 0, 0', t => {
  doTest(t, 1n, 1n, 0n, 0n);
});

test('1, 1, 1, 0', t => {
  doTest(t, 1n, 1n, 1n, 0n);
});

test('1, 2, 1, 1', t => {
  doTest(t, 1n, 2n, 1n, 1n);
});

test('2, 3, 4, 2', t => {
  doTest(t, 2n, 3n, 4n, 2n);
});

test('928861206, 130870247, 746353662, 58306244', t => {
  doTest(t, 928861206n, 130870247n, 746353662n, 58306244n);
});

test('9, 3, 17, 1', t => {
  doTest(t, 9n, 3n, 17n, 1n);
});

test('10000, 5000, 209, 102', t => {
  doTest(t, 10000n, 5000n, 209n, 102n);
});

test('1000000, 5000, 209, 1', t => {
  doTest(t, 1000000n, 5000n, 209n, 1n);
});

test('5000, 1000000, 209, 40122', t => {
  doTest(t, 5000n, 1000000n, 209n, 40122n);
});
