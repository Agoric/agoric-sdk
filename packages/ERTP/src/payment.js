// @jessie-check

import { initEmpty } from '@agoric/store';

/** @import {AssetKind, Brand, Payment} from './types.js' */

// TODO Type InterfaceGuard better than InterfaceGuard<any>
/**
 * @template {AssetKind} K
 * @param {import('@agoric/zone').Zone} issuerZone
 * @param {string} name
 * @param {Brand<K>} brand
 * @param {import('@endo/patterns').InterfaceGuard<any>} PaymentI
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
