import { initEmpty } from '@agoric/store';
import { vivifyExoClass } from '@agoric/vat-data';

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
  const makePayment = vivifyExoClass(
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
