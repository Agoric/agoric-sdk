import { M, matches } from '@agoric/store';

export const NatValuePattern = M.nat();
export const SetValuePattern = M.arrayOf(M.key());
export const AmountValuePattern = M.or(NatValuePattern, SetValuePattern);

export const AmountPattern = harden({
  brand: M.remotable(),
  value: AmountValuePattern,
});

/**
 * Returns true if value is a Nat bigint.
 *
 * @param {Value} value
 * @returns {value is NatValue}
 */
const isNatValue = value => matches(value, NatValuePattern);
harden(isNatValue);

/**
 * Returns true if value is a pass by copy array structure. Does not
 * check for duplicates. To check for duplicates, use setMathHelpers.coerce.
 *
 * @param {Value} value
 * @returns {value is SetValue}
 */
const isSetValue = value => matches(value, SetValuePattern);
harden(isSetValue);

export { isNatValue, isSetValue };
