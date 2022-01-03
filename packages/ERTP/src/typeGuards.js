import { M, matches } from '@agoric/store';

const NatValueShape = M.nat();
const SetValueShape = M.arrayOf(M.key());
const AmountValueShape = M.or(NatValueShape, SetValueShape);

export const AmountShape = harden({
  brand: M.remotable(),
  value: AmountValueShape,
});

/**
 * Returns true if value is a Nat bigint.
 *
 * @param {Value} value
 * @returns {value is NatValue}
 */
const isNatValue = value => matches(value, NatValueShape);
harden(isNatValue);

/**
 * Returns true if value is a pass by copy array structure. Does not
 * check for duplicates. To check for duplicates, use setMathHelpers.coerce.
 *
 * @param {Value} value
 * @returns {value is SetValue}
 */
const isSetValue = value => matches(value, SetValueShape);
harden(isSetValue);

export { isNatValue, isSetValue };
