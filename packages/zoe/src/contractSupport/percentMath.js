import './types';
import { assert } from '@agoric/assert';
import { natSafeMath } from './safeMath';

const { multiply, floorDivide } = natSafeMath;

// make a percentMath object, which represents a unitless fraction between 0
// and 1. It can be multiplied by ERTP amounts to take a percentage.
// complement() produces a new percent object that adds to the original to produce
// 100%.
//
// The default base for the percent is 100, but higher precision can be
// specified.

// There is no method for producing percents by dividing amounts of different
// brands. It only makes sense to produce a percentage by dividing two values
// with the same units. If you divide gallons by miles, the result is not a
// percentage.
/** @type {MakePercent} */
function makePercent(value, base = BigInt(100)) {
  // TODO remove these once all callers are converted?
  value = BigInt(value);
  base = BigInt(base);

  assert(
    value >= BigInt(0) && value <= base,
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
    complement: _ => makePercent(base - value, base),
  });
}
harden(makePercent);

// calculatePercent is an alternative method of producing a percent object by
// dividing two amounts of the same brand.
/** @type {CalculatePercent} */
function calculatePercent(numerator, denominator, base = BigInt(100)) {
  // TODO remove once all callers are converted?
  base = BigInt(base);

  assert(
    numerator.brand === denominator.brand,
    `Dividing amounts of different brands doesn't produce a percent.`,
  );

  const value = floorDivide(multiply(base, numerator.value), denominator.value);
  return makePercent(value, base);
}
harden(calculatePercent);

const ALL = harden(makePercent(BigInt(100)));
const NONE = harden(makePercent(BigInt(0)));

export { makePercent, calculatePercent, ALL, NONE };
