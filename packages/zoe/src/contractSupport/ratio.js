import './types';
import { assert, details as X } from '@agoric/assert';
import { Nat } from '@agoric/nat';
import { natSafeMath } from './safeMath';

const { multiply, floorDivide, subtract } = natSafeMath;

// make a Ratio, which represents a fraction. It is a pass-by-copy record.
//
// The natural syntax for the most common operations we want to support
// are Amount * Ratio and Amount / Ratio. Since the operations want to adhere to
// the ratio rather than the amount, we settled on a calling convention of
// multiplyBy(Amount, Ratio) and divideBy(Amount, Ratio).
//
// The most common kind of Ratio can be applied to Amounts of a particular
// brand, and produces results of the same brand. This represents a multiplier
// that is only applicable to that brand. The less common kind of Ratio can be
// applied to one particular brand of amounts, and produces results of another
// particular brand. This represents some kind of exchange rate. The
// brand-checking helps us ensure that normal Ratios aren't applied to amounts
// of the wrong brand, and that exchange rates are only used in the appropriate
// direction.

const BASIS_POINTS = 10000n;
const PERCENT = 100n;

const ratioPropertyNames = [
  'numerator',
  'denominator',
  'numeratorBrand',
  'denominatorBrand',
];

function assertIsRatio(ratio) {
  const propertyNames = Object.getOwnPropertyNames(ratio);
  assert(
    propertyNames.length === 4,
    X`Ratio ${ratio} must be a record with 4 fields.`,
  );
  for (const name of propertyNames) {
    assert(
      ratioPropertyNames.includes(name),
      X`Parameter must be a Ratio record, but ${ratio} has ${name}`,
    );
  }
  Nat(ratio.numerator);
  Nat(ratio.denominator);
}

export function makeRatio(
  numerator,
  numeratorBrand,
  denominator = PERCENT,
  denominatorBrand = numeratorBrand,
) {
  assert(denominator > 0, X`No infinite ratios!`);

  return harden({
    numerator: Nat(numerator),
    denominator: Nat(denominator),
    numeratorBrand,
    denominatorBrand,
  });
}

export function makeRatioFromAmounts(numeratorAmount, denominatorAmount) {
  assert(denominatorAmount.value > 0, X`No infinite ratios!`);

  return harden({
    numerator: Nat(numeratorAmount.value),
    denominator: Nat(denominatorAmount.value),
    numeratorBrand: numeratorAmount.brand,
    denominatorBrand: denominatorAmount.brand,
  });
}

export function multiplyBy(amount, ratio) {
  assertIsRatio(ratio);
  assert(
    amount.brand === ratio.denominatorBrand,
    X`amount's brand ${amount.brand} must match ratio's denominator ${ratio.denominatorBrand}`,
  );

  return harden({
    value: floorDivide(
      multiply(amount.value, ratio.numerator),
      ratio.denominator,
    ),
    brand: ratio.numeratorBrand,
  });
}

export function divideBy(amount, ratio) {
  assertIsRatio(ratio);
  assert(
    amount.brand === ratio.numeratorBrand,
    X`amount's brand ${amount.brand} must match ratio's numerator ${ratio.numeratorBrand}`,
  );
  return harden({
    value: floorDivide(
      multiply(amount.value, ratio.denominator),
      ratio.numerator,
    ),
    brand: ratio.denominatorBrand,
  });
}

export function invertRatio(ratio) {
  assertIsRatio(ratio);

  return makeRatio(
    ratio.denominator,
    ratio.denominatorBrand,
    ratio.numerator,
    ratio.numeratorBrand,
  );
}

export function multiplyRatios(ratioA, ratioB) {
  assertIsRatio(ratioA);
  assertIsRatio(ratioB);

  if (ratioA.numeratorBrand === ratioB.denominatorBrand) {
    return makeRatio(
      multiply(ratioA.numerator, ratioB.numerator),
      ratioB.numeratorBrand,
      multiply(ratioA.denominator, ratioB.denominator),
      ratioA.denominatorBrand,
    );
  } else if (ratioA.denominatorBrand === ratioB.numeratorBrand) {
    return makeRatio(
      multiply(ratioA.numerator, ratioB.numerator),
      ratioA.numeratorBrand,
      multiply(ratioA.denominator, ratioB.denominator),
      ratioB.denominatorBrand,
    );
  }
  assert.fail(X`Ratios must have a common unit`);
}

// ///// PERCENT ///////////////////

// If ratio is between 0 and 1, subtract from 1.
export function complementPercent(ratio) {
  assertIsRatio(ratio);
  assert(
    ratio.numerator <= ratio.denominator,
    X`Ratio must be less than or equal to 1 to take its complement`,
  );
  return makeRatio(
    subtract(ratio.denominator, ratio.numerator),
    ratio.numeratorBrand,
    ratio.denominator,
    ratio.denominatorBrand,
  );
}

export function make100Percent(brand) {
  return makeRatio(BASIS_POINTS, brand, BASIS_POINTS);
}

export function make0Percent(brand) {
  return makeRatio(0, brand);
}
