import { assert } from '@agoric/assert';
import { isNat, Nat } from '@agoric/nat';

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
export const isNatValue = value => isNat(value);

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
