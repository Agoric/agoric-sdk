// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/zoe/tools/prepare-test-env';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import '../../../src/contractSupport/types';

import { makeIssuerKit } from '@agoric/ertp';
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
  const { amountMath, brand } = makeIssuerKit('moe');
  const moe = amountMath.make;

  const halfDefault = makeRatio(50, brand);
  const halfPrecise = makeRatio(5000, brand, 10000);

  amountsEqual(t, multiplyBy(moe(1333), halfDefault), moe(666), brand);
  amountsEqual(t, multiplyBy(moe(13333333), halfDefault), moe(6666666), brand);
  amountsEqual(t, multiplyBy(moe(1333), halfPrecise), moe(666), brand);
  amountsEqual(t, multiplyBy(moe(13333333), halfPrecise), moe(6666666), brand);
  amountsEqual(t, multiplyBy(moe(0), halfPrecise), moe(0), brand);
});

test('ratio - multiplyBy non Amount', t => {
  const { brand } = makeIssuerKit('moe');

  const badAmount = harden({
    value: 3.5,
    brand,
  });
  t.throws(() => multiplyBy(badAmount, makeRatio(25, brand)), {
    message: '3.5 not a safe integer',
  });
  t.throws(() => divideBy(badAmount, makeRatio(25, brand)), {
    message: '3.5 not a safe integer',
  });
});

test('ratio - onethird', t => {
  const { amountMath, brand } = makeIssuerKit('moe');
  const moe = amountMath.make;

  const oneThird = makeRatioFromAmounts(moe(1), moe(3));

  amountsEqual(t, multiplyBy(moe(100000), oneThird), moe(33333), brand);
});

test('ratio - different brands', t => {
  const { amountMath, brand: moeBrand } = makeIssuerKit('moe');
  const { amountMath: astAmountMath } = makeIssuerKit('ast');
  const moe = amountMath.make;
  const ast = astAmountMath.make;

  const convertToMoe = makeRatioFromAmounts(moe(1), astAmountMath.make(3));
  amountsEqual(t, multiplyBy(ast(10000), convertToMoe), moe(3333), moeBrand);
});

test('ratio - brand mismatch', t => {
  const { amountMath } = makeIssuerKit('moe');
  const { amountMath: astAmountMath } = makeIssuerKit('ast');
  const moe = amountMath.make;
  const ast = astAmountMath.make;

  const convertToMoe = makeRatioFromAmounts(moe(1), astAmountMath.make(3));
  t.throws(() => divideBy(ast(10000), convertToMoe), {
    message: /amount's brand .* must match ratio's numerator .*/,
  });
  t.throws(() => multiplyBy(moe(10000), convertToMoe), {
    message: /amount's brand .* must match ratio's denominator .*/,
  });
});

test.failing('ratio - brand mismatch & details', t => {
  const { amountMath } = makeIssuerKit('moe');
  const { amountMath: astAmountMath } = makeIssuerKit('ast');
  const moe = amountMath.make;
  const ast = astAmountMath.make;

  const convertToMoe = makeRatioFromAmounts(moe(1), astAmountMath.make(3));
  t.throws(() => divideBy(ast(10000), convertToMoe), {
    message: `amount's brand "ast" must match ratio's numerator "moe"`,
  });
  t.throws(() => multiplyBy(moe(10000), convertToMoe), {
    message: `amount's brand "moe" must match ratio's denominator "ast"`,
  });
});

test('ratio - larger than 100%', t => {
  const { amountMath, brand } = makeIssuerKit('moe');
  const moe = amountMath.make;

  const fiveThirds = makeRatioFromAmounts(moe(5), moe(3));

  // 5/3 * 7777
  amountsEqual(t, multiplyBy(moe(7777), fiveThirds), moe(12961), brand);
});

test('ratio - Nats', t => {
  const { brand } = makeIssuerKit('moe');

  t.throws(() => makeRatio(10.1, brand), {
    message: '10.1 not a safe integer',
  });
});

test('ratio division', t => {
  const { amountMath, brand: moeBrand } = makeIssuerKit('moe');
  const moe = amountMath.make;

  const twoFifths = makeRatioFromAmounts(moe(2), moe(5));
  amountsEqual(t, divideBy(moe(100), twoFifths), moe(250), moeBrand);
  amountsEqual(t, multiplyBy(moe(100), twoFifths), moe(40), moeBrand);
  amountsEqual(t, divideBy(moe(0), twoFifths), moe(0), moeBrand);
});

test('ratio inverse', t => {
  const { amountMath, brand: moeBrand } = makeIssuerKit('moe');
  const moe = amountMath.make;

  const twoFifths = makeRatioFromAmounts(moe(2), moe(5));
  const fiveHalves = invertRatio(twoFifths);

  amountsEqual(t, divideBy(moe(100), fiveHalves), moe(40), moeBrand);
  amountsEqual(t, multiplyBy(moe(100), fiveHalves), moe(250), moeBrand);
});

test('ratio bad inputs', t => {
  const { amountMath, brand: moeBrand } = makeIssuerKit('moe');
  const moe = amountMath.make;
  t.throws(() => makeRatio(-3, moeBrand), {
    message: '-3 is negative',
  });
  t.throws(() => makeRatio(3, moeBrand, 100.5), {
    message: '100.5 not a safe integer',
  });
  t.throws(() => makeRatioFromAmounts(3, moe(30)), {
    message: 'undefined is a undefined but must be a bigint or a number',
  });
  t.throws(() => multiplyBy(37, makeRatioFromAmounts(moe(3), moe(5))), {
    message: 'Expected an amount: (a number)',
  });
  t.throws(() => divideBy(makeRatioFromAmounts(moe(3), moe(5)), 37), {
    message: `Expected an amount: (an object)`,
  });
  t.throws(() => makeRatio(3, moeBrand, 0), {
    message: /No infinite ratios! Denoninator was 0/,
  });
  t.throws(() => makeRatioFromAmounts(moe(37), moe(0)), {
    message: /No infinite ratios! Denoninator was 0/,
  });
  t.throws(() => makeRatioFromAmounts(moe(37), moe(0)), {
    message: /No infinite ratios! Denoninator was 0/,
  });
});

test.failing('ratio bad inputs w/brand names', t => {
  const { amountMath, brand: moeBrand } = makeIssuerKit('moe');
  const moe = amountMath.make;
  t.throws(() => makeRatio(3, moeBrand, 0), {
    message: 'No infinite ratios! Denoninator was 0/"moe"',
  });
  t.throws(() => makeRatioFromAmounts(moe(37), moe(0)), {
    message: 'No infinite ratios! Denoninator was 0/"moe"',
  });
  t.throws(() => makeRatioFromAmounts(moe(37), moe(0)), {
    message: 'No infinite ratios! Denoninator was 0/"moe"',
  });
});
