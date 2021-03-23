// @ts-check

import './types';
import { assert, details as X, q } from '@agoric/assert';
import { Nat } from '@agoric/nat';
import { natSafeMath } from './safeMath';

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

/**
 * @param {NatValue} numerator
 * @param {Brand} numeratorBrand
 * @param {NatValue} denominator
 * @param {Brand} denominatorBrand
 * @returns {Ratio}
 */
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

  // TODO(https://github.com/Agoric/agoric-sdk/pull/2310) after the refactoring
  //  use amountMath's constructor here rather than building the record directly
  return harden({
    numerator: { value: Nat(numerator), brand: numeratorBrand },
    denominator: { value: Nat(denominator), brand: denominatorBrand },
  });
};

export const makeRatioFromAmounts = (numeratorAmount, denominatorAmount) => {
  // TODO(https://github.com/Agoric/agoric-sdk/pull/2310) after the refactoring
  // coerce amounts using a native amountMath operation.

  return makeRatio(
    Nat(numeratorAmount.value),
    numeratorAmount.brand,
    Nat(denominatorAmount.value),
    denominatorAmount.brand,
  );
};

export const multiplyBy = (amount, ratio) => {
  // TODO(https://github.com/Agoric/agoric-sdk/pull/2310) after the refactoring
  // coerce amount using a native amountMath operation.
  assert(amount.brand, X`Expected an amount: ${amount}`);
  Nat(amount.value);

  assertIsRatio(ratio);
  assert(
    amount.brand === ratio.denominator.brand,
    X`amount's brand ${q(amount.brand)} must match ratio's denominator ${q(
      ratio.denominator.brand,
    )}`,
  );

  // TODO(https://github.com/Agoric/agoric-sdk/pull/2310) after the refactoring
  //  use amountMath's constructor here rather than building the record directly
  return harden({
    value: floorDivide(
      multiply(amount.value, ratio.numerator.value),
      ratio.denominator.value,
    ),
    brand: ratio.numerator.brand,
  });
};

export const divideBy = (amount, ratio) => {
  // TODO(https://github.com/Agoric/agoric-sdk/pull/2310) after the refactoring
  // coerce amount using a native amountMath operation.
  assert(amount.brand, X`Expected an amount: ${amount}`);
  Nat(amount.value);

  assertIsRatio(ratio);
  assert(
    amount.brand === ratio.numerator.brand,
    X`amount's brand ${q(amount.brand)} must match ratio's numerator ${q(
      ratio.numerator.brand,
    )}`,
  );

  // TODO(https://github.com/Agoric/agoric-sdk/pull/2310) after the refactoring
  //  use amountMath's constructor here rather than building the record directly
  return harden({
    value: floorDivide(
      multiply(amount.value, ratio.denominator.value),
      ratio.numerator.value,
    ),
    brand: ratio.denominator.brand,
  });
};

export const invertRatio = ratio => {
  assertIsRatio(ratio);

  return makeRatio(
    ratio.denominator.value,
    ratio.denominator.brand,
    ratio.numerator.value,
    ratio.numerator.brand,
  );
};
