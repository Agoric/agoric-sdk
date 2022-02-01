// @ts-check
import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';

/**
 * @param {string} allegedName
 * @param {(allegedIssuer: Issuer) => boolean} isMyIssuerNow
 * @param {DisplayInfo} displayInfo
 * @returns {Brand}
 */
export const makeBrand = (allegedName, isMyIssuerNow, displayInfo) => {
  /** @type {Brand} */
  const brand = Far(`${allegedName} brand`, {
    isMyIssuer: allegedIssuerP => E.when(allegedIssuerP, isMyIssuerNow),

    getAllegedName: () => allegedName,

    // Give information to UI on how to display the amount.
    getDisplayInfo: () => displayInfo,
  });
  return brand;
};
