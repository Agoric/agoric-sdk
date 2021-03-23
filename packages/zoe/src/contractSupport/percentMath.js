// @ts-check

import './types';
import { assert, details as X } from '@agoric/assert';
import { Far } from '@agoric/marshal';
import { Nat } from '@agoric/nat';
import { amountMath } from '@agoric/ertp';
import { natSafeMath } from './safeMath';
import { makeRatio } from './ratio';

const { multiply, floorDivide } = natSafeMath;

// make a percentMath object, which represents a unitless fraction. It can be
// multiplied by ERTP amounts that have the same brand to take a percentage.
// complement() produces a new percent object that adds to the original to
// produce 100%. complement() throws if the receiver is greater than 100%.
//
// The default base for the percent is 100, but higher precision can be
// specified.

// There is no method for producing percents by dividing amounts of different
// brands. It only makes sense to produce a percentage by dividing two values
// with the same units. If you divide gallons by miles, the result is not a
// percentage.

/**
 * @deprecated use Ratio instead
 * @type {MakePercent}
 */
function makePercent(value, brand, base = 100n) {
  Nat(value);
  return Far('percent', {
    scale: amount => {
      assert(
        amount.brand === brand,
        `amount must have the same brand as the percent`,
      );
      amount = amountMath.coerce(amount, brand);
      return amountMath.make(
        floorDivide(multiply(amount.value, value), base),
        brand,
      );
    },
    complement: _ => {
      assert(value <= base, X`cannot take complement when > 100%.`);
      return makePercent(base - value, brand, base);
    },
    // Percent is deprecated. This method supports migration.
    makeRatio: _ => makeRatio(value, brand, base),
  });
}
harden(makePercent);

// calculatePercent is an alternative method of producing a percent object by
// dividing two amounts of the same brand.
/** @type {CalculatePercent} */
function calculatePercent(numerator, denominator, base = 100n) {
  assert(
    numerator.brand === denominator.brand,
    `Dividing amounts of different brands doesn't produce a percent.`,
  );
  numerator = amountMath.coerce(numerator, denominator.brand);
  denominator = amountMath.coerce(denominator, numerator.brand);

  const value = floorDivide(multiply(base, numerator.value), denominator.value);
  return makePercent(value, numerator.brand, base);
}
harden(calculatePercent);

/** @type {MakeCanonicalPercent} */
function makeAll(brand) {
  return makePercent(100n, brand);
}

/** @type {MakeCanonicalPercent} */
function makeNone(brand) {
  return makePercent(0n, brand);
}

export { makePercent, calculatePercent, makeAll, makeNone };
