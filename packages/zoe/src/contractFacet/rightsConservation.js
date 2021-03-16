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
  const leftKeys = leftSumsByBrand.keys();
  const rightKeys = rightSumsByBrand.keys();
  assert.equal(
    leftKeys.length,
    rightKeys.length,
    X`${leftKeys.length} should be equal to ${rightKeys.length}`,
  );
  leftSumsByBrand
    .keys()
    .forEach(brand =>
      assert(
        amountMath.isEqual(
          leftSumsByBrand.get(brand),
          rightSumsByBrand.get(brand),
        ),
        X`rights were not conserved for brand ${brand}`,
      ),
    );
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
