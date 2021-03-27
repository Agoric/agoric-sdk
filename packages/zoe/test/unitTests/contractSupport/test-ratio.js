// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import '../../../src/contractSupport/types';

import { makeIssuerKit, amountMath } from '@agoric/ertp';
import {
  makeRatio,
  makeRatioFromAmounts,
  multiplyBy,
  divideBy,
  invertRatio,
} from '../../../src/contractSupport';

function amountsEqual(t, a1, a2, brand) {
  const brandEqual = a1.brand === a2.brand;
  const valueEqual = a1.value === a2.value;
  const correctBrand = a1.brand === brand;
  if (brandEqual && valueEqual && correctBrand) {
    t.truthy(brandEqual);
  } else if (brandEqual && correctBrand) {
    t.fail(`expected equal values: ${a1.value} !== ${a2.value}`);
  } else if (valueEqual) {
    t.fail(`Expected brand ${brand}, but got ${a1.brand} and ${a2.brand}`);
  } else if (!brandEqual && !valueEqual && !correctBrand) {
    t.fail(`nothing matches ${a1}, ${a2}, ${brand}`);
  } else {
    t.fail(
      `neither values: (${a1.value}, ${a2.value}) nor brands matched (${brand} expected) ${a1.brand}, ${a2.brand})`,
    );
  }
}

test('ratio - basic', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => amountMath.make(value, brand);

  const halfDefault = makeRatio(50n, brand);
  const halfPrecise = makeRatio(5000n, brand, 10000n);

  amountsEqual(t, multiplyBy(moe(1333n), halfDefault), moe(666n), brand);
  amountsEqual(
    t,
    multiplyBy(moe(13333333n), halfDefault),
    moe(6666666n),
    brand,
  );
  amountsEqual(t, multiplyBy(moe(1333n), halfPrecise), moe(666n), brand);
  amountsEqual(
    t,
    multiplyBy(moe(13333333n), halfPrecise),
    moe(6666666n),
    brand,
  );
  amountsEqual(t, multiplyBy(moe(0n), halfPrecise), moe(0n), brand);
});

test('ratio - multiplyBy non Amount', t => {
  const { brand } = makeIssuerKit('moe');

  const badAmount = harden({
    value: 3.5,
    brand,
  });
  t.throws(() => multiplyBy(badAmount, makeRatio(25n, brand)), {
    message: '3.5 not a safe integer',
  });
  t.throws(() => divideBy(badAmount, makeRatio(25n, brand)), {
    message: '3.5 not a safe integer',
  });
});

test('ratio - onethird', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => amountMath.make(value, brand);

  const oneThird = makeRatioFromAmounts(moe(1n), moe(3n));

  amountsEqual(t, multiplyBy(moe(100000n), oneThird), moe(33333n), brand);
});

test('ratio - different brands', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => amountMath.make(value, brand);
  const { brand: astBrand } = makeIssuerKit('ast');
  /** @param {bigint} value */
  const ast = value => amountMath.make(value, astBrand);

  const convertToMoe = makeRatioFromAmounts(
    moe(1n),
    amountMath.make(3n, astBrand),
  );
  amountsEqual(t, multiplyBy(ast(10000n), convertToMoe), moe(3333n), brand);
});

test('ratio - brand mismatch', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => amountMath.make(value, brand);
  const { brand: astBrand } = makeIssuerKit('ast');
  /** @param {bigint} value */
  const ast = value => amountMath.make(value, astBrand);

  const convertToMoe = makeRatioFromAmounts(
    moe(1n),
    amountMath.make(3n, astBrand),
  );
  t.throws(() => divideBy(ast(10000n), convertToMoe), {
    message: /amount's brand .* must match ratio's numerator .*/,
  });
  t.throws(() => multiplyBy(moe(10000n), convertToMoe), {
    message: /amount's brand .* must match ratio's denominator .*/,
  });
});

test.failing('ratio - brand mismatch & details', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => amountMath.make(value, brand);
  const { brand: astBrand } = makeIssuerKit('ast');
  /** @param {bigint} value */
  const ast = value => amountMath.make(value, astBrand);

  const convertToMoe = makeRatioFromAmounts(
    moe(1n),
    amountMath.make(3n, astBrand),
  );
  t.throws(() => divideBy(ast(10000n), convertToMoe), {
    message: `amount's brand "ast" must match ratio's numerator "moe"`,
  });
  t.throws(() => multiplyBy(moe(10000n), convertToMoe), {
    message: `amount's brand "moe" must match ratio's denominator "ast"`,
  });
});

test('ratio - larger than 100%', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => amountMath.make(value, brand);

  const fiveThirds = makeRatioFromAmounts(moe(5n), moe(3n));

  // 5/3 * 7777
  amountsEqual(t, multiplyBy(moe(7777n), fiveThirds), moe(12961n), brand);
});

test('ratio - Nats', t => {
  const { brand } = makeIssuerKit('moe');

  // @ts-ignore invalid arguments for testing
  t.throws(() => makeRatio(10.1, brand), {
    message: '10.1 not a safe integer',
  });
});

test('ratio division', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => amountMath.make(value, brand);

  const twoFifths = makeRatioFromAmounts(moe(2n), moe(5n));
  amountsEqual(t, divideBy(moe(100n), twoFifths), moe(250n), brand);
  amountsEqual(t, multiplyBy(moe(100n), twoFifths), moe(40n), brand);
  amountsEqual(t, divideBy(moe(0n), twoFifths), moe(0n), brand);
});

test('ratio inverse', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => amountMath.make(value, brand);

  const twoFifths = makeRatioFromAmounts(moe(2n), moe(5n));
  const fiveHalves = invertRatio(twoFifths);

  amountsEqual(t, divideBy(moe(100n), fiveHalves), moe(40n), brand);
  amountsEqual(t, multiplyBy(moe(100n), fiveHalves), moe(250n), brand);
});

test('ratio bad inputs', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => amountMath.make(value, brand);
  // @ts-ignore invalid arguments for testing
  t.throws(() => makeRatio(-3, brand), {
    message: '-3 is negative',
  });
  // @ts-ignore invalid arguments for testing
  t.throws(() => makeRatio(3n, brand, 100.5), {
    message: '100.5 not a safe integer',
  });
  t.throws(() => makeRatioFromAmounts(3n, moe(30n)), {
    message: 'undefined is a undefined but must be a bigint or a number',
  });
  t.throws(() => multiplyBy(37, makeRatioFromAmounts(moe(3n), moe(5n))), {
    message: /Expected an amount: .*/,
  });
  t.throws(() => divideBy(makeRatioFromAmounts(moe(3n), moe(5n)), 37), {
    message: /Expected an amount: .*/,
  });
  t.throws(() => makeRatio(3n, brand, 0n), {
    message: /No infinite ratios! Denominator was 0/,
  });
  t.throws(() => makeRatioFromAmounts(moe(37n), moe(0n)), {
    message: /No infinite ratios! Denominator was 0/,
  });
  t.throws(() => makeRatioFromAmounts(moe(37n), moe(0n)), {
    message: /No infinite ratios! Denominator was 0/,
  });
});

test.failing('ratio bad inputs w/brand names', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => amountMath.make(value, brand);
  t.throws(() => makeRatio(3n, brand, 0n), {
    message: 'No infinite ratios! Denonimator was 0/"moe"',
  });
  t.throws(() => makeRatioFromAmounts(moe(37n), moe(0n)), {
    message: 'No infinite ratios! Denonimator was 0/"moe"',
  });
  t.throws(() => makeRatioFromAmounts(moe(37n), moe(0n)), {
    message: 'No infinite ratios! Denonimator was 0/"moe"',
  });
});
