// @ts-check

import './types';
import { assert, details as X } from '@agoric/assert';
import { Nat } from '@agoric/nat';
import { natSafeMath } from './safeMath';

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

/** @type {MakePercent} */
function makePercent(value, amountMath, base = 100n) {
  Nat(value);
  return harden({
    scale: amount => {
      assert(
        amountMath.getBrand() === amount.brand,
        `amountMath must have the same brand as amount`,
      );
      return amountMath.make(floorDivide(multiply(amount.value, value), base));
    },
    complement: _ => {
      assert(value <= base, X`cannot take complement when > 100%.`);
      return makePercent(base - value, amountMath, base);
    },
  });
}
harden(makePercent);

// calculatePercent is an alternative method of producing a percent object by
// dividing two amounts of the same brand.
/** @type {CalculatePercent} */
function calculatePercent(numerator, denominator, amountMath, base = 100n) {
  assert(
    numerator.brand === denominator.brand,
    `Dividing amounts of different brands doesn't produce a percent.`,
  );

  const value = floorDivide(multiply(base, numerator.value), denominator.value);
  return makePercent(value, amountMath, base);
}
harden(calculatePercent);

/** @type {MakeCanonicalPercent} */
function makeAll(amountMath) {
  return makePercent(100n, amountMath);
}

/** @type {MakeCanonicalPercent} */
function makeNone(amountMath) {
  return makePercent(0n, amountMath);
}

export { makePercent, calculatePercent, makeAll, makeNone };
