// @ts-check

import { Far } from '@agoric/marshal';

/**
 * @param {string} allegedName
 * @param {Brand} brand
 * @returns {Payment}
 */
export const makePayment = (allegedName, brand) => {
  return Far(`${allegedName} payment`, {
    getAllegedBrand: () => brand,
  });
};
