// @ts-check

import { defineDurableKind, provideKindHandle } from '@agoric/vat-data';

/**
 * @template {AssetKind} K
 * @param {import('@agoric/vat-data').Baggage} issuerBaggage
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
  const paymentKindHandle = provideKindHandle(
    issuerBaggage,
    `${allegedName} payment`,
  );
  const makePayment = defineDurableKind(paymentKindHandle, () => ({}), {
    getAllegedBrand: getBrand,
  });
  return makePayment;
};
harden(defineDurablePaymentKind);
