// @ts-check

import { defineKind } from '@agoric/vat-data';

/**
 * @template {AssetKind} K
 * @param {string} allegedName
 * @param {Brand<K>} brand
 * @returns {() => Payment<K>}
 */
export const makePaymentMaker = (allegedName, brand) => {
  const makePayment = defineKind(`${allegedName} payment`, () => ({}), {
    getAllegedBrand: () => brand,
  });
  // XXX the following type cast is meatball surgery to make tsc shut up
  // somebody who understands this should do it properly
  return /** @type {() => Payment<K>} */ (makePayment);
};
harden(makePaymentMaker);
