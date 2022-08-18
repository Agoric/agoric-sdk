// @ts-check

import { vivifyFarClass } from '@agoric/vat-data';
import { PaymentI } from './typeGuards.js';

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

/**
 * @template {AssetKind} K
 * @param {Baggage} issuerBaggage
 * @param {string} name
 * @param {() => Brand<K>} getBrand must not be called before the issuerKit is
 * created
 * @returns {() => Payment<K>}
 */
export const vivifyPaymentKind = (issuerBaggage, name, getBrand) => {
  const makePayment = vivifyFarClass(
    issuerBaggage,
    `${name} payment`,
    PaymentI,
    () => ({}),
    {
      getAllegedBrand() {
        return getBrand();
      },
    },
  );
  return makePayment;
};
harden(vivifyPaymentKind);
