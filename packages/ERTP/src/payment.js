// @ts-check

import { initEmpty } from '@agoric/store';
import { vivifyFarClass } from '@agoric/vat-data';

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

/**
 * @template {AssetKind} K
 * @param {Baggage} issuerBaggage
 * @param {string} name
 * @param {Brand<K>} brand
 * @param {InterfaceGuard} PaymentI
 * @returns {() => Payment<K>}
 */
export const vivifyPaymentKind = (issuerBaggage, name, brand, PaymentI) => {
  const makePayment = vivifyFarClass(
    issuerBaggage,
    `${name} payment`,
    PaymentI,
    initEmpty,
    {
      getAllegedBrand() {
        return brand;
      },
    },
  );
  return makePayment;
};
harden(vivifyPaymentKind);
