// @ts-check

import makeStore from '@agoric/store';
import { assert, details as X } from '@agoric/assert';
import { amountMath } from '@agoric/ertp';

import '../../exported';
import '../internal-types';

/**
 * Iterate over the amounts and sum, storing the sums in a
 * map by brand.
 *
 * @param  {Amount[]} amounts - an array of amounts
 * @returns {Store<Brand, Amount>} sumsByBrand - a map of Brand keys and
 * Amount values. The amounts are the sums.
 */
const sumByBrand = amounts => {
  const sumsByBrand = makeStore('brand');
  amounts.forEach(amount => {
    const { brand } = amount;
    if (!sumsByBrand.has(brand)) {
      sumsByBrand.init(brand, amount);
    } else {
      const sumSoFar = sumsByBrand.get(brand);
      sumsByBrand.set(brand, amountMath.add(sumSoFar, amount));
    }
  });
  return sumsByBrand;
};

/**
 * Assert that the left sums by brand equal the right sums by brand
 *
 * @param  {Store<Brand, Amount>} leftSumsByBrand - a map of brands to sums
 * @param  {Store<Brand, Amount>} rightSumsByBrand - a map of brands to sums
 * indexed by issuer
 */
const assertEqualPerBrand = (leftSumsByBrand, rightSumsByBrand) => {
  // We cannot assume that all of the brand keys present in
  // leftSumsByBrand are also present in rightSumsByBrand. A empty
  // amount could be introduced or dropped, and this should still be
  // deemed "equal" from the perspective of rights conservation.

  // Thus, we should allow for a brand to be missing from a map, but
  // only if the sum for the brand in the other map is empty.

  /**
   * A helper that either gets the sum for the specified brand, or if
   * the brand is absent in the map, returns an empty amount.
   *
   * @param {Store<Brand, Amount>} sumsByBrandMap
   * @param {Brand} brand
   * @param {Amount} amount
   * @returns {Amount}
   */
  const getOrEmpty = (sumsByBrandMap, brand, amount) => {
    if (!sumsByBrandMap.has(brand)) {
      return amountMath.makeEmptyFromAmount(amount);
    }
    return sumsByBrandMap.get(brand);
  };

  const assertSumsEqualInMap = (mapToIterate, mapToCheck) => {
    mapToIterate.keys().forEach(brand => {
      const toIterateSum = mapToIterate.get(brand);
      const toCheckSumOrEmpty = getOrEmpty(mapToCheck, brand, toIterateSum);
      assert(
        amountMath.isEqual(toIterateSum, toCheckSumOrEmpty),
        X`rights were not conserved for brand ${brand}`,
      );
    });
  };

  assertSumsEqualInMap(leftSumsByBrand, rightSumsByBrand);
  assertSumsEqualInMap(rightSumsByBrand, leftSumsByBrand);
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
