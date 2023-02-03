import { initEmpty } from '@agoric/store';

/**
 * @template {AssetKind} K
 * @param {Place} issuerPlace
 * @param {string} name
 * @param {Brand<K>} brand
 * @param {InterfaceGuard} PaymentI
 * @returns {() => Payment<K>}
 */
export const preparePaymentKind = (issuerPlace, name, brand, PaymentI) => {
  const makePayment = issuerPlace.exoClass(
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
