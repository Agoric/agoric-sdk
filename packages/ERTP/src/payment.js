// @jessie-check

import { initEmpty } from '@agoric/store';

/**
 * @import {AssetKind, Brand, Payment} from './types.js'
 * @import {Zone} from '@agoric/zone';
 * @import {InterfaceGuard} from '@endo/patterns';
 */

// TODO Type InterfaceGuard better than InterfaceGuard<any>
/**
 * @template {AssetKind} K
 * @param {Zone} issuerZone
 * @param {string} name
 * @param {Brand<K>} brand
 * @param {InterfaceGuard<any>} PaymentI
 * @returns {() => Payment<K, any>}
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
  // @ts-expect-error [tag] for tagged type not defined in runtime
  return makePayment;
};
harden(preparePaymentKind);
