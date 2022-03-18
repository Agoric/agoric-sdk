// @ts-check

import { Far } from '@endo/marshal';

/**
 * @template {AssetKind} K
 * @param {string} allegedName
 * @param {Brand<K>} brand
 * @returns {Payment<K>}
 */
export const makePayment = (allegedName, brand) => {
  return Far(`${allegedName} payment`, {
    getAllegedBrand: () => brand,
  });
};
