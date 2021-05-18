// @ts-check
import { E } from '@agoric/eventual-send';

import { markBrand } from './markObjects.js';

/**
 * @param {string} allegedName
 * @param {Promise<Issuer>} issuerP
 * @param {DisplayInfo} displayInfo
 * @returns {Brand}
 */
export const makeBrand = (allegedName, issuerP, displayInfo) => {
  /** @type {Brand} */
  const brand = markBrand(allegedName, {
    isMyIssuer: allegedIssuerP => {
      return E.when(
        Promise.all([allegedIssuerP, issuerP]),
        ([allegedIssuer, issuer]) => {
          return allegedIssuer === issuer;
        },
      );
    },
    getAllegedName: () => allegedName,

    // Give information to UI on how to display the amount.
    getDisplayInfo: () => displayInfo,
  });
  return brand;
};
