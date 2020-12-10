import './types';
import { assert } from '@agoric/assert';
import { natSafeMath } from './index';

const { multiply, floorDivide } = natSafeMath;

// make a percentMath object, which represents a unitless fraction between 0
// and 1. It can be multiplied by ERTP amounts to take a percentage. inverse()
// produces a new percent object that is the  original's additive complement.
//
// The default base for the percent is 100, but higher precision can be
// specified.
/** @type {MakePercent} */
function makePercent(value, base = 100) {
  assert(
    value >= 0 && value <= base,
    `percentages (${value}) must be between 0 and base (${base})`,
  );

  return harden({
    scale: (amountMath, amount) => {
      assert(
        amountMath.getBrand() === amount.brand,
        `amountMath must have the same brand as amount`,
      );
      return amountMath.make(floorDivide(multiply(amount.value, value), base));
    },
    inverse: _ => makePercent(base - value, base),
  });
}
harden(makePercent);

// calculatePercent is an alternative method of producing a percent object by
// dividing two amounts of the same brand.
/** @type {CalculatePercent} */
function calculatePercent(numerator, denominator, base = 100) {
  assert(
    numerator.brand === denominator.brand,
    `use calculatePercentAmounts() when brands don't match`,
  );

  const value = floorDivide(multiply(base, numerator.value), denominator.value);
  return makePercent(value, base);
}
harden(calculatePercent);

// calculatePercentAmounts produces a percent object by dividing two amounts
// that might be of different brands. We encourage the use of calculatePercent()
// as the more common call, since it only makes sense to produce a percentage by
// dividing two values with the same units. When you divide gallons by miles,
// you don't get a percentage.
/** @type {CalculatePercentAmounts} */
function calculatePercentAmounts(numerator, denominator, base = 100) {
  const value = floorDivide(multiply(base, numerator.value), denominator.value);
  return makePercent(value, base);
}
harden(calculatePercentAmounts);

const ALL = harden(makePercent(100));
const NONE = harden(makePercent(0));

export { makePercent, calculatePercent, calculatePercentAmounts, ALL, NONE };
