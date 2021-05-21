// @ts-check
/* global makeKind */

import { Far } from '@agoric/marshal';

export const makePaymentMaker = (allegedName, brand) => {
  const paymentVOFactory = _state => {
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
