// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import '../../../src/contractSupport/types.js';

import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import {
  makeRatio,
  makeRatioFromAmounts,
  multiplyBy,
  divideBy,
  floorMultiplyBy,
  floorDivideBy,
  ceilMultiplyBy,
  ceilDivideBy,
  invertRatio,
  oneMinus,
  multiplyRatios,
  addRatios,
} from '../../../src/contractSupport/index.js';

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

test('ratio - basic (floor)', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => AmountMath.make(value, brand);

  const halfDefault = makeRatio(50n, brand);
  const halfPrecise = makeRatio(5000n, brand, 10000n);

  amountsEqual(t, floorMultiplyBy(moe(1333n), halfDefault), moe(666n), brand);
  amountsEqual(
    t,
    floorMultiplyBy(moe(13333333n), halfDefault),
    moe(6666666n),
    brand,
  );
  amountsEqual(t, floorMultiplyBy(moe(1333n), halfPrecise), moe(666n), brand);
  amountsEqual(
    t,
    floorMultiplyBy(moe(13333333n), halfPrecise),
    moe(6666666n),
    brand,
  );
  amountsEqual(t, floorMultiplyBy(moe(0n), halfPrecise), moe(0n), brand);
});

test('ratio - basic (ceil)', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => AmountMath.make(value, brand);

  const halfDefault = makeRatio(50n, brand);
  const halfPrecise = makeRatio(5000n, brand, 10000n);

  amountsEqual(t, ceilMultiplyBy(moe(1333n), halfDefault), moe(667n), brand);
  amountsEqual(
    t,
    ceilMultiplyBy(moe(13333333n), halfDefault),
    moe(6666667n),
    brand,
  );
  amountsEqual(t, ceilMultiplyBy(moe(1333n), halfPrecise), moe(667n), brand);
  amountsEqual(
    t,
    ceilMultiplyBy(moe(13333333n), halfPrecise),
    moe(6666667n),
    brand,
  );
  amountsEqual(t, ceilMultiplyBy(moe(0n), halfPrecise), moe(0n), brand);
});

// TODO: (3676) drop when the deprecated multiplyBy is removed
test('ratio - basic deprecated', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => AmountMath.make(value, brand);

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
  t.throws(() => floorMultiplyBy(badAmount, makeRatio(25n, brand)), {
    message: 'value 3.5 must be a Nat or an array',
  });
  t.throws(() => ceilMultiplyBy(badAmount, makeRatio(25n, brand)), {
    message: 'value 3.5 must be a Nat or an array',
  });
  t.throws(() => floorDivideBy(badAmount, makeRatio(25n, brand)), {
    message: 'value 3.5 must be a Nat or an array',
  });
  t.throws(() => ceilDivideBy(badAmount, makeRatio(25n, brand)), {
    message: 'value 3.5 must be a Nat or an array',
  });
});

// TODO: (3676) drop when the deprecated multiplyBy is removed
test('ratio - multiplyBy non Amount deprecated', t => {
  const { brand } = makeIssuerKit('moe');

  const badAmount = harden({
    value: 3.5,
    brand,
  });
  t.throws(() => multiplyBy(badAmount, makeRatio(25n, brand)), {
    message: 'value 3.5 must be a Nat or an array',
  });
  t.throws(() => divideBy(badAmount, makeRatio(25n, brand)), {
    message: 'value 3.5 must be a Nat or an array',
  });
});

test('ratio - onethird', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => AmountMath.make(value, brand);

  const oneThird = makeRatioFromAmounts(moe(1n), moe(3n));

  amountsEqual(t, floorMultiplyBy(moe(100000n), oneThird), moe(33333n), brand);
  amountsEqual(t, ceilMultiplyBy(moe(100000n), oneThird), moe(33334n), brand);
});

// TODO: (3676) drop when the deprecated multiplyBy is removed
test('ratio - onethird deprecated', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => AmountMath.make(value, brand);

  const oneThird = makeRatioFromAmounts(moe(1n), moe(3n));

  amountsEqual(t, multiplyBy(moe(100000n), oneThird), moe(33333n), brand);
});

test('ratio - different brands', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => AmountMath.make(value, brand);
  const { brand: astBrand } = makeIssuerKit('ast');
  /** @param {bigint} value */
  const ast = value => AmountMath.make(value, astBrand);

  const convertToMoe = makeRatioFromAmounts(
    moe(1n),
    AmountMath.make(3n, astBrand),
  );
  amountsEqual(
    t,
    floorMultiplyBy(ast(10000n), convertToMoe),
    moe(3333n),
    brand,
  );
  amountsEqual(t, ceilMultiplyBy(ast(10000n), convertToMoe), moe(3334n), brand);
});

// TODO: (3676) drop when the deprecated multiplyBy is removed
test('ratio - different brands deprecated', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => AmountMath.make(value, brand);
  const { brand: astBrand } = makeIssuerKit('ast');
  /** @param {bigint} value */
  const ast = value => AmountMath.make(value, astBrand);

  const convertToMoe = makeRatioFromAmounts(
    moe(1n),
    AmountMath.make(3n, astBrand),
  );
  amountsEqual(t, multiplyBy(ast(10000n), convertToMoe), moe(3333n), brand);
});

test('ratio - brand mismatch', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => AmountMath.make(value, brand);
  const { brand: astBrand } = makeIssuerKit('ast');
  /** @param {bigint} value */
  const ast = value => AmountMath.make(value, astBrand);

  const convertToMoe = makeRatioFromAmounts(
    moe(1n),
    AmountMath.make(3n, astBrand),
  );
  t.throws(() => floorDivideBy(ast(10000n), convertToMoe), {
    message: /amount's brand .* must match ratio's numerator .*/,
  });
  t.throws(() => floorMultiplyBy(moe(10000n), convertToMoe), {
    message: /amount's brand .* must match ratio's denominator .*/,
  });
  t.throws(() => ceilDivideBy(ast(10000n), convertToMoe), {
    message: /amount's brand .* must match ratio's numerator .*/,
  });
  t.throws(() => ceilMultiplyBy(moe(10000n), convertToMoe), {
    message: /amount's brand .* must match ratio's denominator .*/,
  });
});

// TODO: (3676) drop when the deprecated multiplyBy is removed
test('ratio - brand mismatch deprecated', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => AmountMath.make(value, brand);
  const { brand: astBrand } = makeIssuerKit('ast');
  /** @param {bigint} value */
  const ast = value => AmountMath.make(value, astBrand);

  const convertToMoe = makeRatioFromAmounts(
    moe(1n),
    AmountMath.make(3n, astBrand),
  );
  t.throws(() => divideBy(ast(10000n), convertToMoe), {
    message: /amount's brand .* must match ratio's numerator .*/,
  });
  t.throws(() => multiplyBy(moe(10000n), convertToMoe), {
    message: /amount's brand .* must match ratio's denominator .*/,
  });
});

test('ratio - brand mismatch & details', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => AmountMath.make(value, brand);
  const { brand: astBrand } = makeIssuerKit('ast');
  /** @param {bigint} value */
  const ast = value => AmountMath.make(value, astBrand);

  const convertToMoe = makeRatioFromAmounts(
    moe(1n),
    AmountMath.make(3n, astBrand),
  );
  t.throws(() => floorDivideBy(ast(10000n), convertToMoe), {
    message: `amount's brand "[Alleged: ast brand]" must match ratio's numerator "[Alleged: moe brand]"`,
  });
  t.throws(() => ceilDivideBy(ast(10000n), convertToMoe), {
    message: `amount's brand "[Alleged: ast brand]" must match ratio's numerator "[Alleged: moe brand]"`,
  });
  t.throws(() => floorMultiplyBy(moe(10000n), convertToMoe), {
    message: `amount's brand "[Alleged: moe brand]" must match ratio's denominator "[Alleged: ast brand]"`,
  });
  t.throws(() => ceilMultiplyBy(moe(10000n), convertToMoe), {
    message: `amount's brand "[Alleged: moe brand]" must match ratio's denominator "[Alleged: ast brand]"`,
  });
});

// TODO: (3676) drop when the deprecated multiplyBy is removed
test('ratio - brand mismatch & details deprecated', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => AmountMath.make(value, brand);
  const { brand: astBrand } = makeIssuerKit('ast');
  /** @param {bigint} value */
  const ast = value => AmountMath.make(value, astBrand);

  const convertToMoe = makeRatioFromAmounts(
    moe(1n),
    AmountMath.make(3n, astBrand),
  );
  t.throws(() => divideBy(ast(10000n), convertToMoe), {
    message: `amount's brand "[Alleged: ast brand]" must match ratio's numerator "[Alleged: moe brand]"`,
  });
  t.throws(() => multiplyBy(moe(10000n), convertToMoe), {
    message: `amount's brand "[Alleged: moe brand]" must match ratio's denominator "[Alleged: ast brand]"`,
  });
});

test('ratio - larger than 100%', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => AmountMath.make(value, brand);

  const fiveThirds = makeRatioFromAmounts(moe(5n), moe(3n));

  // 5/3 * 7777
  amountsEqual(t, floorMultiplyBy(moe(7777n), fiveThirds), moe(12961n), brand);
  amountsEqual(t, ceilMultiplyBy(moe(7777n), fiveThirds), moe(12962n), brand);
});

// TODO: (3676) drop when the deprecated multiplyBy is removed
test('ratio - larger than 100% deprecated', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => AmountMath.make(value, brand);

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
  const moe = value => AmountMath.make(value, brand);

  const twoFifths = makeRatioFromAmounts(moe(2n), moe(5n));
  amountsEqual(t, floorDivideBy(moe(100n), twoFifths), moe(250n), brand);
  amountsEqual(t, ceilDivideBy(moe(100n), twoFifths), moe(250n), brand);
  amountsEqual(t, floorMultiplyBy(moe(100n), twoFifths), moe(40n), brand);
  amountsEqual(t, ceilMultiplyBy(moe(100n), twoFifths), moe(40n), brand);
  amountsEqual(t, floorDivideBy(moe(0n), twoFifths), moe(0n), brand);
  amountsEqual(t, ceilDivideBy(moe(0n), twoFifths), moe(0n), brand);
});

// TODO: (3676) drop when the deprecated multiplyBy is removed
test('ratio division deprecated', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => AmountMath.make(value, brand);

  const twoFifths = makeRatioFromAmounts(moe(2n), moe(5n));
  amountsEqual(t, divideBy(moe(100n), twoFifths), moe(250n), brand);
  amountsEqual(t, multiplyBy(moe(100n), twoFifths), moe(40n), brand);
  amountsEqual(t, divideBy(moe(0n), twoFifths), moe(0n), brand);
});

test('ratio inverse', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => AmountMath.make(value, brand);

  const twoFifths = makeRatioFromAmounts(moe(2n), moe(5n));
  const fiveHalves = invertRatio(twoFifths);

  amountsEqual(t, floorDivideBy(moe(100n), fiveHalves), moe(40n), brand);
  amountsEqual(t, ceilDivideBy(moe(100n), fiveHalves), moe(40n), brand);
  amountsEqual(t, floorMultiplyBy(moe(100n), fiveHalves), moe(250n), brand);
  amountsEqual(t, ceilMultiplyBy(moe(100n), fiveHalves), moe(250n), brand);
});

// TODO: (3676) drop when the deprecated multiplyBy is removed
test('ratio inverse deprecated', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => AmountMath.make(value, brand);

  const twoFifths = makeRatioFromAmounts(moe(2n), moe(5n));
  const fiveHalves = invertRatio(twoFifths);

  amountsEqual(t, divideBy(moe(100n), fiveHalves), moe(40n), brand);
  amountsEqual(t, multiplyBy(moe(100n), fiveHalves), moe(250n), brand);
});

test('ratio bad inputs', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => AmountMath.make(value, brand);
  // @ts-ignore invalid arguments for testing
  t.throws(() => makeRatio(-3, brand), {
    message: '-3 is negative',
  });
  // @ts-ignore invalid arguments for testing
  t.throws(() => makeRatio(3n, brand, 100.5), {
    message: '100.5 not a safe integer',
  });
  t.throws(() => makeRatioFromAmounts(3n, moe(30n)), {
    message: `The brand "[undefined]" doesn't look like a brand.`,
  });
  t.throws(() => floorMultiplyBy(37, makeRatioFromAmounts(moe(3n), moe(5n))), {
    message: `The brand "[undefined]" doesn't look like a brand.`,
  });
  t.throws(() => ceilMultiplyBy(37, makeRatioFromAmounts(moe(3n), moe(5n))), {
    message: `The brand "[undefined]" doesn't look like a brand.`,
  });
  t.throws(() => floorDivideBy(makeRatioFromAmounts(moe(3n), moe(5n)), 37), {
    message: `The brand "[undefined]" doesn't look like a brand.`,
  });
  t.throws(() => ceilDivideBy(makeRatioFromAmounts(moe(3n), moe(5n)), 37), {
    message: `The brand "[undefined]" doesn't look like a brand.`,
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

// TODO: (3676) drop when the deprecated multiplyBy is removed
test('ratio bad inputs deprecated', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => AmountMath.make(value, brand);
  // @ts-ignore invalid arguments for testing
  t.throws(() => multiplyBy(37, makeRatioFromAmounts(moe(3n), moe(5n))), {
    message: `The brand "[undefined]" doesn't look like a brand.`,
  });
  t.throws(() => divideBy(makeRatioFromAmounts(moe(3n), moe(5n)), 37), {
    message: `The brand "[undefined]" doesn't look like a brand.`,
  });
});

test('ratio bad inputs w/brand names', t => {
  const { brand } = makeIssuerKit('moe');
  /** @param {bigint} value */
  const moe = value => AmountMath.make(value, brand);
  t.throws(() => makeRatio(3n, brand, 0n), {
    message: 'No infinite ratios! Denominator was 0/"[Alleged: moe brand]"',
  });
  t.throws(() => makeRatioFromAmounts(moe(37n), moe(0n)), {
    message: 'No infinite ratios! Denominator was 0/"[Alleged: moe brand]"',
  });
  t.throws(() => makeRatioFromAmounts(moe(37n), moe(0n)), {
    message: 'No infinite ratios! Denominator was 0/"[Alleged: moe brand]"',
  });
});

test('multiply ratios', t => {
  const { brand } = makeIssuerKit('moe');

  /** @param {bigint} value */
  const moe = value => AmountMath.make(value, brand);

  const twoFifths = makeRatioFromAmounts(moe(2n), moe(5n));
  const fiveSixths = makeRatioFromAmounts(moe(5n), moe(6n));
  t.deepEqual(
    makeRatio(10n, brand, 30n, brand),
    multiplyRatios(fiveSixths, twoFifths),
  );
});

test('add ratios', t => {
  const { brand } = makeIssuerKit('moe');

  /** @param {bigint} value */
  const moe = value => AmountMath.make(value, brand);

  const twoFifths = makeRatioFromAmounts(moe(2n), moe(5n));
  const fiveSixths = makeRatioFromAmounts(moe(5n), moe(6n));
  t.deepEqual(
    makeRatio(37n, brand, 30n, brand),
    addRatios(fiveSixths, twoFifths),
  );
});

test('ratio - complement', t => {
  const { brand } = makeIssuerKit('moe');
  const moe = value => AmountMath.make(value, brand);

  const oneThird = makeRatioFromAmounts(moe(1), moe(3));
  const twoThirds = oneMinus(oneThird);

  t.deepEqual(twoThirds, makeRatio(2, brand, 3));
  amountsEqual(t, floorMultiplyBy(moe(100000), oneThird), moe(33333), brand);
  amountsEqual(t, ceilMultiplyBy(moe(100000), oneThird), moe(33334), brand);
  amountsEqual(t, floorMultiplyBy(moe(100000), twoThirds), moe(66666), brand);
  amountsEqual(t, ceilMultiplyBy(moe(100000), twoThirds), moe(66667), brand);

  t.throws(() => oneMinus(moe(3)), {
    message:
      'Parameter must be a Ratio record, but {"brand":"[Alleged: moe brand]","value":"[3n]"} has "brand"',
  });
  t.throws(() => oneMinus(makeRatioFromAmounts(moe(30), moe(20))), {
    message: /Parameter must be less than or equal to 1: .*/,
  });
});

// TODO: (3676) drop when the deprecated multiplyBy is removed
test('ratio - complement deprecated', t => {
  const { brand } = makeIssuerKit('moe');
  const moe = value => AmountMath.make(value, brand);

  const oneThird = makeRatioFromAmounts(moe(1), moe(3));
  const twoThirds = oneMinus(oneThird);

  t.deepEqual(twoThirds, makeRatio(2, brand, 3));
  amountsEqual(t, multiplyBy(moe(100000), oneThird), moe(33333), brand);
  amountsEqual(t, multiplyBy(moe(100000), twoThirds), moe(66666), brand);
});
