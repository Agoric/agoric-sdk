import { isNat } from '@agoric/nat';
import { passStyleOf, isStructure } from '@agoric/marshal';

/**
 * Returns true if value is a Nat bigint.
 *
 * @param {Value} value
 * @returns {value is NatValue}
 */
const isNatValue = value => {
  return typeof value === 'bigint' && isNat(value);
};
harden(isNatValue);

/**
 * Returns true if value is a pass by copy array structure. Does not
 * check for duplicates. To check for duplicates, use setMathHelpers.coerce.
 *
 * @param {Value} value
 * @returns {value is SetValue}
 */
const isSetValue = value => {
  return passStyleOf(value) === 'copyArray' && isStructure(value);
};
harden(isSetValue);

export { isNatValue, isSetValue };
