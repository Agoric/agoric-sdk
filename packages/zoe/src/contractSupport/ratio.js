// @ts-check

import './types.js';
import { assert, details as X, q } from '@agoric/assert';
import { Nat } from '@agoric/nat';
import { AmountMath } from '@agoric/ertp';
import { natSafeMath } from './safeMath.js';

const { multiply, floorDivide, ceilDivide, add, subtract } = natSafeMath;

// make a Ratio, which represents a fraction. It is a pass-by-copy record.
//
// The natural syntax for the most common operations we want to support
// are Amount * Ratio and Amount / Ratio. Since the operations want to adhere to
// the ratio rather than the amount, we settled on a calling convention of
// [ceil|floor]MultiplyBy(Amount, Ratio) and [ceil|floor]DivideBy(Amount, Ratio)
//
// The most common kind of Ratio can be applied to Amounts of a particular
// brand, and produces results of the same brand. This represents a multiplier
// that is only applicable to that brand. The less common kind of Ratio can be
// applied to one particular brand of amounts, and produces results of another
// particular brand. This represents some kind of exchange rate. The
// brand-checking helps us ensure that normal Ratios aren't applied to amounts
// of the wrong brand, and that exchange rates are only used in the appropriate
// direction.
//
// Since the ratios are represented by a numerator and a denominator, every
// multiplication or division operation that produces an amount ends with a
// division of the underlying bigIntegers, and bigInteger division requires that
// the rounding mode (round up or round down) be specified. It would be a
// mistake to hide this distinction from the caller, so we make it very visible
// by using floorMultiplyBy, ceilMultiplyBy, floorDivideBy, and ceilDivideBy.
// The operations without floor/ceil are still present, but won't be kept around
// for long.

const PERCENT = 100n;

const ratioPropertyNames = ['numerator', 'denominator'];

export const assertIsRatio = ratio => {
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
};

/** @type {MakeRatio} */
export const makeRatio = (
  numerator,
  numeratorBrand,
  denominator = PERCENT,
  denominatorBrand = numeratorBrand,
) => {
  assert(
    denominator > 0n,
    X`No infinite ratios! Denominator was 0/${q(denominatorBrand)}`,
  );

  return harden({
    numerator: AmountMath.make(numeratorBrand, Nat(numerator)),
    denominator: AmountMath.make(denominatorBrand, Nat(denominator)),
  });
};

/** @type {MakeRatioFromAmounts} */
export const makeRatioFromAmounts = (numeratorAmount, denominatorAmount) => {
  AmountMath.coerce(numeratorAmount, numeratorAmount.brand);
  AmountMath.coerce(denominatorAmount, denominatorAmount.brand);
  return makeRatio(
    // @ts-ignore coerce ensures values are Nats
    Nat(numeratorAmount.value),
    numeratorAmount.brand,
    // @ts-ignore coerce ensures values are Nats
    Nat(denominatorAmount.value),
    denominatorAmount.brand,
  );
};

const multiplyHelper = (amount, ratio, divideOp) => {
  AmountMath.coerce(amount, amount.brand);
  assertIsRatio(ratio);
  assert(
    amount.brand === ratio.denominator.brand,
    X`amount's brand ${q(amount.brand)} must match ratio's denominator ${q(
      ratio.denominator.brand,
    )}`,
  );

  return AmountMath.make(
    ratio.numerator.brand,
    divideOp(
      multiply(amount.value, ratio.numerator.value),
      ratio.denominator.value,
    ),
  );
};

/** @type {FloorMultiplyBy} */
export const floorMultiplyBy = (amount, ratio) => {
  return multiplyHelper(amount, ratio, floorDivide);
};

/** @type {CeilMultiplyBy} */
export const ceilMultiplyBy = (amount, ratio) => {
  return multiplyHelper(amount, ratio, ceilDivide);
};

/**
 * @deprecated use floorMultiplyBy() or ceilMultiplyBy()
 * @type {MultiplyBy}
 */
export const multiplyBy = (amount, ratio) => {
  return floorMultiplyBy(amount, ratio);
};

const divideHelper = (amount, ratio, divideOp) => {
  AmountMath.coerce(amount, amount.brand);
  assertIsRatio(ratio);
  assert(
    amount.brand === ratio.numerator.brand,
    X`amount's brand ${q(amount.brand)} must match ratio's numerator ${q(
      ratio.numerator.brand,
    )}`,
  );

  return AmountMath.make(
    divideOp(
      multiply(amount.value, ratio.denominator.value),
      ratio.numerator.value,
    ),
    ratio.denominator.brand,
  );
};

/** @type {FloorDivideBy} */
export const floorDivideBy = (amount, ratio) => {
  return divideHelper(amount, ratio, floorDivide);
};

/** @type {CeilDivideBy} */
export const ceilDivideBy = (amount, ratio) => {
  return divideHelper(amount, ratio, ceilDivide);
};

/**
 * @deprecated use floorDivideBy() or ceilDivideBy()
 * @type {DivideBy}
 */
export const divideBy = (amount, ratio) => {
  return floorDivideBy(amount, ratio);
};

/** @type {InvertRatio} */
export const invertRatio = ratio => {
  assertIsRatio(ratio);

  return makeRatio(
    // @ts-ignore assertIsRatio ensures values are Nats
    ratio.denominator.value,
    ratio.denominator.brand,
    // @ts-ignore assertIsRatio ensures values are Nats
    ratio.numerator.value,
    ratio.numerator.brand,
  );
};

/** @type {AddRatios} */
export const addRatios = (left, right) => {
  assertIsRatio(right);
  assertIsRatio(left);
  assert(
    left.numerator.brand === left.denominator.brand &&
      left.numerator.brand === right.numerator.brand &&
      left.numerator.brand === right.denominator.brand,
    X`all brands must match:  ${q(left)} ${q(right)}`,
  );

  return makeRatio(
    add(
      multiply(left.numerator.value, right.denominator.value),
      multiply(left.denominator.value, right.numerator.value),
    ),
    left.numerator.brand,
    multiply(left.denominator.value, right.denominator.value),
  );
};

/** @type {MultiplyRatios} */
export const multiplyRatios = (left, right) => {
  assertIsRatio(right);
  assertIsRatio(left);
  assert(
    left.numerator.brand === left.denominator.brand &&
      left.numerator.brand === right.numerator.brand &&
      left.numerator.brand === right.denominator.brand,
    X`all brands must match:  ${q(left)} ${q(right)}`,
  );

  return makeRatio(
    multiply(left.numerator.value, right.numerator.value),
    left.numerator.brand,
    multiply(left.denominator.value, right.denominator.value),
  );
};

// If ratio is between 0 and 1, subtract from 1.
/** @type {OneMinus} */
export const oneMinus = ratio => {
  assertIsRatio(ratio);
  assert(
    ratio.numerator.brand === ratio.denominator.brand,
    X`oneMinus only supports ratios with a single brand, but ${ratio.numerator.brand} doesn't match ${ratio.denominator.brand}`,
  );
  assert(
    ratio.numerator.value <= ratio.denominator.value,
    X`Parameter must be less than or equal to 1: ${ratio.numerator.value}/${ratio.denominator.value}`,
  );
  return makeRatio(
    subtract(ratio.denominator.value, ratio.numerator.value),
    ratio.numerator.brand,
    // @ts-ignore asserts ensure values are Nats
    ratio.denominator.value,
    ratio.numerator.brand,
  );
};
