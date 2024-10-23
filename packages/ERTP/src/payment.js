// @jessie-check

import { prepareRevocableMakerKit } from '@agoric/base-zone/zone-helpers.js';
import { initEmpty } from '@agoric/store';

/** @import {AssetKind, Brand, Payment} from './types.js' */

/**
 * @template {AssetKind} K
 * @typedef {object} PaymentMakerKit
 * @property {(payment: Payment<K>) => boolean} revokePayment
 * @property {() => Payment<K>} makePayment
 */

// TODO Type InterfaceGuard better than InterfaceGuard<any>
/**
 * @template {AssetKind} K
 * @param {import('@agoric/zone').Zone} issuerZone
 * @param {string} name
 * @param {Brand<K>} brand
 * @param {import('@endo/patterns').InterfaceGuard<any>} PaymentI
 * @returns {PaymentMakerKit<K>}
 */
export const preparePaymentMakerKit = (issuerZone, name, brand, PaymentI) => {
  const paymentKindName = `${name} payment`;

  /**
   * @type {import('@agoric/base-zone/zone-helpers.js').RevocableMakerKit<
   *   Payment<K>
   * >}
   */
  const { revoke, makeRevocable } = prepareRevocableMakerKit(
    issuerZone,
    paymentKindName,
    ['getAllegedBrand'],
  );

  const makeUnderlyingPayment = issuerZone.exoClass(
    paymentKindName,
    PaymentI,
    initEmpty,
    {
      getAllegedBrand() {
        return brand;
      },
    },
  );

  const makePayment = () => makeRevocable(makeUnderlyingPayment());
  return harden({
    revokePayment: revoke,
    makePayment,
  });
};
harden(preparePaymentMakerKit);
