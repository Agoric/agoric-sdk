// @ts-check

import { provide } from '@agoric/store';
import { defineDurableKind, makeKindHandle } from '@agoric/vat-data';

/**
 * @template {AssetKind} K
 * @param {MapStore<string,any>} issuerBaggage
 * @param {string} allegedName
 * @param {() => Brand<K>} getBrand must not be called before the issuerKit is
 * created
 * @returns {() => Payment<K>}
 */
export const defineDurablePaymentKind = (
  issuerBaggage,
  allegedName,
  getBrand,
) => {
  const paymentKindHandle = provide(issuerBaggage, 'paymentKindHandle', () =>
    makeKindHandle(`${allegedName} payment`),
  );
  const makePayment = defineDurableKind(paymentKindHandle, () => ({}), {
    getAllegedBrand: getBrand,
  });
  return makePayment;
};
harden(defineDurablePaymentKind);
