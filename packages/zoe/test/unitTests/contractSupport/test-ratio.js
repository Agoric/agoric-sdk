// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
import test from 'ava';
import '../../../src/contractSupport/types';

import { makeIssuerKit } from '@agoric/ertp';
import {
  makeRatio,
  makeRatioFromAmounts,
  multiplyBy,
  divideBy,
  invertRatio,
  multiplyRatios,
  complementPercent,
  make100Percent,
  make0Percent,
} from '../../../src/contractSupport/ratio';

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
});

test('ratio - onethird', t => {
  const { amountMath, brand } = makeIssuerKit('moe');
  const moe = amountMath.make;

  const oneThirdPer100 = makeRatioFromAmounts(moe(1), moe(3), 100);
  const oneThirdPrecise = makeRatioFromAmounts(moe(1), moe(3));

  amountsEqual(t, multiplyBy(moe(100000), oneThirdPer100), moe(33000), brand);
  amountsEqual(t, multiplyBy(moe(100000), oneThirdPrecise), moe(33330), brand);
});

test('ratio - brand mismatch', t => {
  const { amountMath, brand: moeBrand } = makeIssuerKit('moe');
  const { amountMath: astAmountMath } = makeIssuerKit('ast');
  const moe = amountMath.make;
  const ast = astAmountMath.make;

  const convertToMoe = makeRatioFromAmounts(
    moe(1),
    astAmountMath.make(3),
    10000,
  );
  amountsEqual(t, multiplyBy(ast(10_000), convertToMoe), moe(3333), moeBrand);
});

test('ratio - ALL', t => {
  const { amountMath, brand } = makeIssuerKit('moe');
  const moe = amountMath.make;

  amountsEqual(
    t,
    multiplyBy(moe(100_000), make100Percent(brand)),
    moe(100_000),
    brand,
  );
});

test('ratio - NONE', t => {
  const { amountMath, brand } = makeIssuerKit('moe');
  const moe = amountMath.make;

  amountsEqual(
    t,
    amountMath.getEmpty(),
    multiplyBy(moe(100000), make0Percent(brand)),
    brand,
  );
});

test('ratio - complement', t => {
  const { amountMath, brand } = makeIssuerKit('moe');
  const moe = amountMath.make;

  const oneThirdPer100 = makeRatioFromAmounts(moe(1), moe(3), 100);
  const twoThirdsPer100 = complementPercent(oneThirdPer100);
  const oneThirdPrecise = makeRatioFromAmounts(moe(1), moe(3));
  const twoThirdsPrecise = complementPercent(oneThirdPrecise);

  amountsEqual(t, multiplyBy(moe(100000), oneThirdPer100), moe(33000), brand);
  amountsEqual(t, multiplyBy(moe(100000), twoThirdsPer100), moe(67000), brand);
  amountsEqual(t, multiplyBy(moe(100000), twoThirdsPrecise), moe(66670), brand);

  t.throws(() =>
    complementPercent(moe(3), {
      message: 'Ratio must be a record with 4 fields',
    }),
  );
  t.throws(() => complementPercent(makeRatioFromAmounts(moe(30), moe(20))), {
    message: 'Ratio must be less than 1 to take its complement',
  });
});

test('ratio - non-standard thirds', t => {
  const { amountMath, brand: moeBrand } = makeIssuerKit('moe');
  const moe = amountMath.make;

  const oneThirdPer100 = makeRatioFromAmounts(moe(1), moe(3), 100);
  const oneThirdBetter = makeRatioFromAmounts(moe(1), moe(3), 1000);
  const oneThirdPrecise = makeRatio(1, moeBrand, 3, moeBrand);

  amountsEqual(t, multiplyBy(moe(9000), oneThirdPer100), moe(2970), moeBrand);
  amountsEqual(t, multiplyBy(moe(9000), oneThirdBetter), moe(2997), moeBrand);
  amountsEqual(t, multiplyBy(moe(9000), oneThirdPrecise), moe(3000), moeBrand);
});

test('ratio - larger than 100%', t => {
  const { amountMath, brand } = makeIssuerKit('moe');
  const moe = amountMath.make;

  const oneFiftyPer100 = makeRatioFromAmounts(moe(5), moe(3), 100);
  const oneFiftyBetter = makeRatioFromAmounts(moe(5), moe(3), 1000);

  // 1.66 * 7777
  amountsEqual(t, multiplyBy(moe(7777), oneFiftyPer100), moe(12909), brand);
  // 1.666 * 7777
  amountsEqual(t, multiplyBy(moe(7777), oneFiftyBetter), moe(12956), brand);
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
});

test('ratio inverse', t => {
  const { amountMath, brand: moeBrand } = makeIssuerKit('moe');
  const moe = amountMath.make;

  const twoFifths = makeRatioFromAmounts(moe(2), moe(5));
  const fiveHalves = invertRatio(twoFifths);

  amountsEqual(t, divideBy(moe(100), fiveHalves), moe(40), moeBrand);
  amountsEqual(t, multiplyBy(moe(100), fiveHalves), moe(250), moeBrand);
});

test('ratio multiple Ratios', t => {
  const { amountMath: moeMath } = makeIssuerKit('moe');
  const { amountMath: curlyMath } = makeIssuerKit('curly');
  const { amountMath: larryMath, brand: larryBrand } = makeIssuerKit('larry');
  const moe = moeMath.make;
  const larry = larryMath.make;
  const curly = curlyMath.make;

  const fourFifths = makeRatioFromAmounts(larry(4), moe(5));
  const half = makeRatioFromAmounts(moe(10), curly(20));
  const fiveEighths = makeRatioFromAmounts(moe(25), curly(40), 1000);

  amountsEqual(
    t,
    multiplyBy(curly(1000), multiplyRatios(fourFifths, fiveEighths)),
    larry(500),
    larryBrand,
  );

  amountsEqual(
    t,
    multiplyBy(curly(100), multiplyRatios(half, fourFifths)),
    larry(40),
    larryBrand,
  );

  t.throws(() => multiplyRatios(half, fiveEighths), {
    message: 'Ratios must have a common unit',
  });
  t.throws(() => multiplyRatios(moe(5), fiveEighths), {
    message: 'Ratio (an object) must be a record with 4 fields.',
  });
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
    message: `amount's brand (an undefined) must match ratio's denominator (an object)`,
  });
  t.throws(() => divideBy(makeRatioFromAmounts(moe(3), moe(5)), 37), {
    message: `Ratio (a number) must be a record with 4 fields.`,
  });
});
