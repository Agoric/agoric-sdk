// @ts-check

import { defineKind } from '@agoric/swingset-vat/src/storeModule.js';

/**
 * @param {string} allegedName
 * @param {Brand} brand
 * @returns {() => Payment}
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
