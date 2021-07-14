// @ts-check

import { AmountMath } from '@agoric/ertp';

/**
 * Validate that the address is a string and that the amount is a
 * valid Amount of the right brand. Coerce the amount and return it.
 *
 * @param {Brand} externalBrand
 * @param {Address} address
 * @param {Amount} amount
 * @returns {Amount}
 */
const validateInputs = (externalBrand, address, amount) => {
  assert.typeof(address, 'string');
  // Will throw if amount is invalid
  return AmountMath.coerce(externalBrand, amount);
};
harden(validateInputs);

export { validateInputs };
