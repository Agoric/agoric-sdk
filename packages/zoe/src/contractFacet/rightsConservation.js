import { assert, Fail } from '@endo/errors';
import { makeScalarMapStore } from '@agoric/store';
import { AmountMath } from '@agoric/ertp';

import '../internal-types.js';
/**
 * @import {MapStore} from '@agoric/store';
 */

/**
 * Iterate over the amounts and sum, storing the sums in a
 * map by brand.
 *
 * @param  {Amount[]} amounts - an array of amounts
 * @returns {MapStore<Brand, Amount>} sumsByBrand - a map of Brand keys and
 * Amount values. The amounts are the sums.
 */
const sumByBrand = amounts => {
  /** @type {MapStore<Brand, Amount>} */
  const sumsByBrand = makeScalarMapStore('brand');
  for (const amount of amounts) {
    const { brand } = amount;
    if (!sumsByBrand.has(brand)) {
      sumsByBrand.init(brand, amount);
    } else {
      const sumSoFar = sumsByBrand.get(brand);
      sumsByBrand.set(brand, AmountMath.add(sumSoFar, amount));
    }
  }
  return sumsByBrand;
};

/**
 * Assert that the left sums by brand equal the right sums by brand
 *
 * @param  {MapStore<Brand, Amount>} leftSumsByBrand - a map of brands to sums
 * @param  {MapStore<Brand, Amount>} rightSumsByBrand - a map of brands to sums
 */
const assertEqualPerBrand = (leftSumsByBrand, rightSumsByBrand) => {
  // We cannot assume that all of the brand keys present in
  // leftSumsByBrand are also present in rightSumsByBrand. A empty
  // amount could be introduced or dropped, and this should still be
  // deemed "equal" from the perspective of rights conservation.

  // Thus, we should allow for a brand to be missing from a map, but
  // only if the sum for the brand in the other map is empty.

  /**
   * A helper that either gets the sums for the specified brand, or if
   * the brand is absent in the map, returns an empty amount.
   *
   * @param {Brand} brand
   * @returns {{ leftSum: Amount, rightSum: Amount }}
   */
  const getSums = brand => {
    let leftSum;
    let rightSum;
    if (leftSumsByBrand.has(brand)) {
      leftSum = leftSumsByBrand.get(brand);
    }
    if (rightSumsByBrand.has(brand)) {
      rightSum = rightSumsByBrand.get(brand);
    }
    if (leftSum === undefined) {
      assert(rightSum);
      leftSum = AmountMath.makeEmptyFromAmount(rightSum);
    }
    if (rightSum === undefined) {
      rightSum = AmountMath.makeEmptyFromAmount(leftSum);
    }
    return { leftSum, rightSum };
  };

  const allBrands = new Set([
    ...leftSumsByBrand.keys(),
    ...rightSumsByBrand.keys(),
  ]);

  for (const brand of allBrands) {
    const { leftSum, rightSum } = getSums(brand);
    AmountMath.isEqual(leftSum, rightSum) ||
      Fail`rights were not conserved for brand ${brand} ${leftSum.value} != ${rightSum.value}`;
  }
};

/**
 * `assertRightsConserved` checks that the total amount per brand is
 * equal to the total amount per brand in the proposed reallocation
 *
 * @param {Amount[]} previousAmounts - an array of the amounts before the
 * proposed reallocation
 * @param {Amount[]} newAmounts - an array of the amounts in the
 * proposed reallocation
 * @returns {void}
 */
function assertRightsConserved(previousAmounts, newAmounts) {
  const sumsPrevAmounts = sumByBrand(previousAmounts);
  const sumsNewAmounts = sumByBrand(newAmounts);
  assertEqualPerBrand(sumsPrevAmounts, sumsNewAmounts);
}

export { assertRightsConserved };
