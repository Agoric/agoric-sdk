// @ts-check

import { defineKind } from '@agoric/vat-data';

/**
 * @template {AssetKind} K
 * @param {string} allegedName
 * @param {Brand<K>} brand
 * @returns {() => Payment<K>}
 */
export const definePaymentKind = (allegedName, brand) => {
  const makePayment = defineKind(`${allegedName} payment`, () => ({}), {
    getAllegedBrand: () => brand,
  });
  return makePayment;
};
harden(definePaymentKind);
