// @jessie-check

import { initEmpty } from '@agoric/store';

/** @typedef {import('@endo/patterns').MethodGuard} MethodGuard */
/**
 * @template {Record<string | symbol, MethodGuard>} [T=Record<string | symbol, MethodGuard>]
 * @typedef {import('@endo/patterns').InterfaceGuard<T>} InterfaceGuard
 */
/** @typedef {import('@agoric/zone').Zone} Zone */

/**
 * @template {AssetKind} K
 * @param {Zone} issuerZone
 * @param {string} name
 * @param {Brand<K>} brand
 * @param {InterfaceGuard} PaymentI
 * @returns {() => Payment<K>}
 */
export const preparePaymentKind = (issuerZone, name, brand, PaymentI) => {
  const makePayment = issuerZone.exoClass(
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
