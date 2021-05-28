// @ts-check
/* global makeKind */

import { Far } from '@agoric/marshal';

/**
 * @param {string} allegedName
 * @param {Brand} brand
 * @returns {() => Payment}
 */
export const makePaymentMaker = (allegedName, brand) => {
  const paymentVOFactory = () => {
    return {
      init: () => {},
      self: Far(`${allegedName} payment`, {
        getAllegedBrand: () => brand,
      }),
    };
  };

  const makePayment = makeKind(paymentVOFactory);

  return makePayment;
};
