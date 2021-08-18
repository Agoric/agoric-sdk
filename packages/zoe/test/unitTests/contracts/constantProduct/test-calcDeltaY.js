// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import { AmountMath } from '@agoric/ertp';

import { calcDeltaYSellingX } from '../../../../src/contracts/constantProduct/core';
import { setupMintKits } from './setupMints';

// the brands of x and y shouldn't matter (test this explicitly in a
// separate test)
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
  t.throws(() => doTest(t, 0, 0, 0, 0), {
    message: 'No infinite ratios! Denominator was 0/"[Alleged: RUN brand]"',
  });
});

test('0, 0, 1, 0', t => {
  doTest(t, 0, 0, 1, 0);
});

test('1, 0, 0, 0', t => {
  doTest(t, 1, 0, 0, 0);
});

// deltaXPlusX is 0
test('0, 1, 0, 0', t => {
  t.throws(() => doTest(t, 0, 1, 0, 0), {
    message: 'No infinite ratios! Denominator was 0/"[Alleged: RUN brand]"',
  });
});

test('1, 1, 0, 0', t => {
  doTest(t, 1, 1, 0, 0);
});

test('1, 1, 1, 0', t => {
  doTest(t, 1, 1, 1, 0);
});

test('1, 2, 1, 1', t => {
  doTest(t, 1, 2, 1, 1);
});

test('2, 3, 4, 2', t => {
  doTest(t, 2, 3, 4, 2);
});

test('928861206, 130870247, 746353662, 58306244', t => {
  doTest(t, 928861206n, 130870247n, 746353662n, 58306244n);
});

test('9, 3, 17, 1', t => {
  doTest(t, 9, 3, 17, 1);
});

test('10000, 5000, 209, 102', t => {
  doTest(t, 10000, 5000, 209, 102);
});
