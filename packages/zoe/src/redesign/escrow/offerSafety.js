// @ts-check

import { AmountMath } from '@agoric/ertp';

import { sumByBrand } from './rightsConservation';

// TODO: add types
// TODO add unit tests

/**
 *
 * @param {Array<Amount>} left - an array of amounts, of various brands
 * @param {Array<Amount>} right - an array of amounts, of various brands
 * @returns {boolean}
 */
const areAmountsGTE = (left, right) => {
  // Sum the amounts by brand to get a mapping of brands to the total sums
  const sumsLeft = sumByBrand(left);
  const sumsRight = sumByBrand(right);

  const checkBrands = () => {
    // if right has any brands not in left, left is not GTE to right
    const brandsInLeft = new Set(sumsLeft.keys());
    const everyRightBrandAlsoInLeft = sumsRight
      .keys()
      .every(brandInRight => brandsInLeft.has(brandInRight));
    return everyRightBrandAlsoInLeft;
  };

  const checkAmountsGTE = () => {
    return sumsRight.entries().every(([brand, amountInRight]) => {
      const amountInLeft = sumsLeft.get(brand);
      return AmountMath.isGTE(amountInLeft, amountInRight);
    });
  };

  return checkBrands() && checkAmountsGTE();
};

harden(areAmountsGTE);

/**
 * `isOfferSafe` checks whether proposed amounts fulfill offer safety
 * for a single escrow account .
 *
 * Note: This implementation checks whether the proposed amounts are
 * GTE to the initial amounts and whether the proposed allocation is
 * GTE to the wanted amounts. Both can be true. Only one has to be
 * true for offer safety to be satisfied.
 *
 * @param {Array<Amount>} initialAmounts - the initial amounts in the
 * escrow account
 * @param {Array<Amount>} wantedAmounts - the user wants these
 * amounts in return, if the escrowed amounts are taken. In other
 * words, offer safety ensures that the escrowed amounts can only be
 * taken if these amounts or more are given.
 * @param {Array<Amount>} proposedAmounts - the amounts we are
 * checking for offer safety, which will become the currentAmounts if
 * all checks pass
 * @returns {boolean}
 */
const isOfferSafe = (initialAmounts, wantedAmounts, proposedAmounts) =>
  areAmountsGTE(proposedAmounts, initialAmounts) ||
  areAmountsGTE(proposedAmounts, wantedAmounts);

export { isOfferSafe, areAmountsGTE };
