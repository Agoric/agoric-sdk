// @ts-check
import { E } from '@agoric/eventual-send';

import { markBrand } from './markObjects.js';

/**
 * @param {string} allegedName
 * @param {(allegedIssuer: Issuer) => boolean} isMyIssuerNow
 * @param {DisplayInfo} displayInfo
 * @returns {Brand}
 */
export const makeBrand = (allegedName, isMyIssuerNow, displayInfo) => {
  /** @type {Brand} */
  const brand = markBrand(allegedName, {
    isMyIssuer: allegedIssuerP => E.when(allegedIssuerP, isMyIssuerNow),

    getAllegedName: () => allegedName,

    // Give information to UI on how to display the amount.
    getDisplayInfo: () => displayInfo,
  });
  return brand;
};
