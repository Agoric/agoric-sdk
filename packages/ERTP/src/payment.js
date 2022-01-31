// @ts-check

import { Far } from '@endo/marshal';

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
