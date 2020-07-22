// @ts-check

import makeStore from '@agoric/store';
import { assert, details } from '@agoric/assert';

/**
 * @template K,V
 * @typedef {import('@agoric/store').Store<K, V>} Store
 */

/**
 * Iterate over the amounts and sum, storing the sums in a
 * map by brand.
 * @param  {(brand: Brand) => AmountMath} getAmountMath - a function
 * to get amountMath given a brand.
 * @param  {Amount[]} amounts - an array of amounts
 * @returns {Store<Brand, Amount>} sumsByBrand - a map of Brand keys and
 * Amount values. The amounts are the sums.
 */
const sumByBrand = (getAmountMath, amounts) => {
  const sumsByBrand = makeStore('brand');
  amounts.forEach(amount => {
    const { brand } = amount;
    const amountMath = getAmountMath(brand);
    if (!sumsByBrand.has(brand)) {
      sumsByBrand.init(brand, amountMath.getEmpty());
    }
    const sumSoFar = sumsByBrand.get(brand);
    sumsByBrand.set(brand, amountMath.add(sumSoFar, amount));
  });
  return sumsByBrand;
};

/**
 * Do the left sums by brand equal the right sums by brand?
 * @param  {(brand: Brand) => AmountMath} getAmountMath - a function
 * to get amountMath given a brand.
 * @param  {Store<Brand, Amount>} leftSumsByBrand - a map of brands to sums
 * @param  {Store<Brand, Amount>} rightSumsByBrand - a map of brands to sums
 * indexed by issuer
 */
const isEqualPerBrand = (getAmountMath, leftSumsByBrand, rightSumsByBrand) => {
  const leftKeys = leftSumsByBrand.keys();
  const rightKeys = rightSumsByBrand.keys();
  assert.equal(
    leftKeys.length,
    rightKeys.length,
    details`${leftKeys.length} should be equal to ${rightKeys.length}`,
  );
  return leftSumsByBrand
    .keys()
    .every(brand =>
      getAmountMath(brand).isEqual(
        leftSumsByBrand.get(brand),
        rightSumsByBrand.get(brand),
      ),
    );
};

/**
 * `areRightsConserved` checks that the total amount per brand is
 * equal to the total amount per brand in the proposed reallocation
 * @param  {(brand: Brand) => AmountMath} getAmountMath - a function
 * to get amountMath given a brand.
 * @param  {Amount[]} previousAmounts - an array of the amounts before the
 * proposed reallocation
 * @param  {Amount[]} newAmounts - an array of the amounts in the
 * proposed reallocation
 *
 * @returns {boolean} isEqualPerBrand
 */
function areRightsConserved(getAmountMath, previousAmounts, newAmounts) {
  const sumsPrevAmounts = sumByBrand(getAmountMath, previousAmounts);
  const sumsNewAmounts = sumByBrand(getAmountMath, newAmounts);
  return isEqualPerBrand(getAmountMath, sumsPrevAmounts, sumsNewAmounts);
}

export { areRightsConserved };
