// @ts-check

import { defineKind } from '@agoric/vat-data';

/**
 * @template {AssetKind} K
 * @param {string} allegedName
 * @param {Brand<K>} brand
 * @returns {() => Payment<K>}
 */
export const makePaymentMaker = (allegedName, brand) => {
  const makePayment = defineKind(
    `${allegedName} payment`,
    () => ({}),
    () => ({
      getAllegedBrand: () => brand,
    }),
  );
  return makePayment;
};
harden(makePaymentMaker);
