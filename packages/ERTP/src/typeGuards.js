import { assert } from '@agoric/assert';
import { Nat } from '@agoric/nat';

/**
 * Type guard for SetValue
 *
 * @param {Value} value
 * @returns {value is SetValue}
 */
export const isSetValue = value => Array.isArray(value);

/**
 * Type guard for NatValue
 *
 * @param {Value} value
 * @returns {value is NatValue}
 */
export const isNatValue = value => {
  if (isSetValue(value)) {
    return false;
  }
  return typeof Nat(value) === 'bigint';
};

/**
 * @param {NatMathHelpers | SetMathHelpers } mathHelpers
 * @returns {mathHelpers is SetMathHelpers}
 */
export const isSetMathHelpers = mathHelpers =>
  isSetValue(mathHelpers.doMakeEmpty());

/**
 * @param {NatMathHelpers | SetMathHelpers } mathHelpers
 * @returns {mathHelpers is NatMathHelpers}
 */
export const isNatMathHelpers = mathHelpers =>
  isNatValue(mathHelpers.doMakeEmpty());

/**
 * @param {Value} value
 * @returns {asserts SetValue}
 */
export const assertSetValue = value =>
  assert(isSetValue(value), `Must be a SetValue`);

/**
 * @param {Value} value
 * @returns {asserts NatValue}
 */
export const assertNatValue = value =>
  assert(isNatValue(value), `Must be a NatValue`);
