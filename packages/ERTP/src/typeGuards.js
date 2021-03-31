import { isNat } from '@agoric/nat';
import { passStyleOf, REMOTE_STYLE } from '@agoric/marshal';

const { isFrozen } = Object;

// A type guard predicate named `looksLikeFoo` tests that something seems to be
// a Foo, produces static type info on the truthy path alleging that it is a
// Foo, but does not validate that it is a well formed Foo. Names like `isFoo`
// should be reserved for predicates that actually validate objects coming from
// untrusted callers.
//
// The corresponding assertions would be `assertLooksLikeFoo` and `assertFoo`.
// These produce the same static type info, but on the success path rather than
// the truthy path.

/**
 * Non-validating type guard for SetValue
 *
 * Used as a pre-validation check to select which validator
 * (mathHelpers) to use, and also used with assert to satisfy
 * Typescript checking
 *
 * @param {Value} value
 * @returns {value is SetValue}
 */
export const looksLikeSetValue = value => Array.isArray(value);

/**
 * Non-validating type guard for NatValue.
 *
 * Used as a pre-validation check to select which validator
 * (mathHelpers) to use, and also used with assert to satisfy
 * Typescript checking
 *
 * @param {Value} value
 * @returns {value is NatValue}
 */
export const looksLikeNatValue = value => isNat(value);

/**
 * Call this for a validated answer (that in this case happens to be the same).
 *
 * @param {Value} value
 * @returns {value is NatValue}
 */
export const isNatValue = looksLikeNatValue;

/**
 * Non-validating type guard for Value.
 *
 * @param {Value} value
 * @returns {value is Value}
 */
export const looksLikeValue = value =>
  looksLikeSetValue(value) || looksLikeNatValue(value);

/**
 * Non-validating type guard for Brand.
 *
 * @param {Brand} brand
 * @returns {brand is Brand}
 */
export const looksLikeBrand = brand =>
  isFrozen(brand) && passStyleOf(brand) === REMOTE_STYLE;
