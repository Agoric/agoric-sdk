import { isNat } from '@agoric/nat';

/**
 * Type guard for SetValue
 * Used as a pre-validation check to select which validator
 * (mathHelpers) to use, and also used with assert to satisfy
 * Typescript checking
 *
 * @param {Value} value
 * @returns {value is SetValue}
 */
export const isSetValue = value => Array.isArray(value);

/**
 * Type guard for NatValue.
 * Used as a pre-validation check to select which validator
 * (mathHelpers) to use, and also used with assert to satisfy
 * Typescript checking
 *
 * @param {Value} value
 * @returns {value is NatValue}
 */
export const isNatValue = value => isNat(value);
