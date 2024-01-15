// @jessie-check

import { initEmpty } from '@agoric/store';
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
 * @returns {{
 *   makePayment: () => Payment<K>;
 *   revokePayment: (payment: Payment<K>) => boolean;
 * }}
 */
export const preparePaymentKind = (issuerBaggage, name, brand, PaymentI) => {
  let revokePayment;
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
    {
      receiveRevoker(revoke) {
        revokePayment = revoke;
      },
    },
  );
  assert(revokePayment !== undefined);
  return harden({
    makePayment,
    revokePayment,
  });
};
harden(preparePaymentKind);
