import './types';
import { assert, details as X, q } from '@agoric/assert';
import { Nat } from '@agoric/nat';
import { natSafeMath } from '.';

const { multiply, floorDivide } = natSafeMath;

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

const PERCENT = 100n;

const ratioPropertyNames = ['numerator', 'denominator'];

export function assertIsRatio(ratio) {
  const propertyNames = Object.getOwnPropertyNames(ratio);
  assert(
    propertyNames.length === 2,
    X`Ratio ${ratio} must be a record with 2 fields.`,
  );
  for (const name of propertyNames) {
    assert(
      ratioPropertyNames.includes(name),
      X`Parameter must be a Ratio record, but ${ratio} has ${q(name)}`,
    );
  }
  Nat(ratio.numerator.value);
  Nat(ratio.denominator.value);
}

export function makeRatio(
  numerator,
  numeratorBrand,
  denominator = PERCENT,
  denominatorBrand = numeratorBrand,
) {
  assert(denominator > 0n, X`No infinite ratios!`);

  return harden({
    numerator: { value: Nat(numerator), brand: numeratorBrand },
    denominator: { value: Nat(denominator), brand: denominatorBrand },
  });
}

export function makeRatioFromAmounts(numeratorAmount, denominatorAmount) {
  assert(denominatorAmount.value > 0, X`No infinite ratios!`);

  return harden({
    numerator: {
      value: Nat(numeratorAmount.value),
      brand: numeratorAmount.brand,
    },
    denominator: {
      value: Nat(denominatorAmount.value),
      brand: denominatorAmount.brand,
    },
  });
}

export function multiplyBy(amount, ratio) {
  assertIsRatio(ratio);
  assert(
    amount.brand === ratio.denominator.brand,
    X`amount's brand ${amount.brand} must match ratio's denominator ${ratio.denominator.brand}`,
  );

  return harden({
    value: floorDivide(
      multiply(amount.value, ratio.numerator.value),
      ratio.denominator.value,
    ),
    brand: ratio.numerator.brand,
  });
}

export function divideBy(amount, ratio) {
  assertIsRatio(ratio);
  assert(
    amount.brand === ratio.numerator.brand,
    X`amount's brand ${amount.brand} must match ratio's numerator ${ratio.numerator.brand}`,
  );
  return harden({
    value: floorDivide(
      multiply(amount.value, ratio.denominator.value),
      ratio.numerator.value,
    ),
    brand: ratio.denominator.brand,
  });
}

export function invertRatio(ratio) {
  assertIsRatio(ratio);

  return makeRatio(
    ratio.denominator.value,
    ratio.denominator.brand,
    ratio.numerator.value,
    ratio.numerator.brand,
  );
}

export function multiplyRatios(ratioA, ratioB) {
  assertIsRatio(ratioA);
  assertIsRatio(ratioB);

  if (ratioA.numerator.brand === ratioB.denominator.brand) {
    return makeRatio(
      multiply(ratioA.numerator.value, ratioB.numerator.value),
      ratioB.numerator.brand,
      multiply(ratioA.denominator.value, ratioB.denominator.value),
      ratioA.denominator.brand,
    );
  } else if (ratioA.denominator.brand === ratioB.numerator.brand) {
    return makeRatio(
      multiply(ratioA.numerator.value, ratioB.numerator.value),
      ratioA.numerator.brand,
      multiply(ratioA.denominator.value, ratioB.denominator.value),
      ratioB.denominator.brand,
    );
  }
  assert.fail(X`Ratios must have a common unit`);
}
