// @ts-check
/* global makeKind */

import { Far } from '@agoric/marshal';

export const makePaymentMaker = (allegedName, brand) => {
  const paymentVOFactory = state => {
    return {
      init: b => (state.brand = b),
      self: Far(`${allegedName} payment`, {
        getAllegedBrand: () => state.brand,
      }),
    };
  };

  const paymentMaker = makeKind(paymentVOFactory);

  const makePayment = () => paymentMaker(brand);

  return makePayment;
};
