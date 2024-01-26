// @jessie-check

import { initEmpty } from '@endo/exo';
import { prepareExoClass } from '@agoric/vat-data';

/** @typedef {import('@endo/patterns').MethodGuard} MethodGuard */
/**
 * @template {Record<string | symbol, MethodGuard>} [T=Record<string | symbol, MethodGuard>]
 * @typedef {import('@endo/patterns').InterfaceGuard<T>} InterfaceGuard
 */
/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

/**
 * @template {AssetKind} K
 * @param {Baggage} issuerBaggage
 * @param {string} name
 * @param {Brand<K>} brand
 * @param {InterfaceGuard} PaymentI
 * @returns {() => Payment<K>}
 */
export const preparePaymentKind = (issuerBaggage, name, brand, PaymentI) => {
  const makePayment = prepareExoClass(
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
harden(preparePaymentKind);
