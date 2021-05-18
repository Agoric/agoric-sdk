// @ts-check
/* global makeKind */

import { markPayment } from './markObjects';

export const makePaymentMaker = (allegedName, brand) => {
  const paymentVOFactory = state => {
    return {
      init: b => (state.brand = b),
      self: markPayment(allegedName, {
        getAllegedBrand: () => state.brand,
      }),
    };
  };

  const paymentMaker = makeKind(paymentVOFactory);

  const makePayment = () => paymentMaker(brand);

  return makePayment;
};
