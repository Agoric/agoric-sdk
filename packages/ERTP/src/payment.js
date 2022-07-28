// @ts-check

/** @typedef {import('@agoric/vat-data').Porter} Porter */

/**
 * @template {AssetKind} K
 * @param {Porter} issuerPorter
 * @param {string} name
 * @param {() => Brand<K>} getBrand must not be called before the issuerKit is
 * created
 * @returns {() => Payment<K>}
 */
export const vivifyPaymentKind = (issuerPorter, name, getBrand) => {
  const makePayment = issuerPorter.vivifyKind(`${name} payment`, () => ({}), {
    getAllegedBrand: getBrand,
  });
  return makePayment;
};
harden(vivifyPaymentKind);
