import { isNat } from '@agoric/nat';
import { assert, details as X } from '@agoric/assert';
import { passStyleOf, REMOTE_STYLE } from '@agoric/marshal';
import './types';

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
 * (mathHelpers) to use.
 *
 * @param {unknown} allegedValue
 * @returns {allegedValue is SetValue}
 */
export const looksLikeSetValue = allegedValue => Array.isArray(allegedValue);

/**
 * Non-validating type guard for NatValue.
 *
 * Used as a pre-validation check to select which validator
 * (mathHelpers) to use.
 *
 * @param {unknown} allegedValue
 * @returns {allegedValue is NatValue}
 */
export const looksLikeNatValue = allegedValue => isNat(allegedValue);

/**
 * Non-validating type guard for Value
 *
 * @param {unknown} allegedValue
 * @returns {allegedValue is Value}
 */
export const looksLikeValue = allegedValue =>
  looksLikeSetValue(allegedValue) || looksLikeNatValue(allegedValue);

/**
 * Non-validating type guard for Brand
 *
 * @param {unknown} allegedBrand
 * @returns {allegedBrand is Brand}
 */
export const looksLikeBrand = allegedBrand =>
  passStyleOf(allegedBrand) === REMOTE_STYLE;

/**
 * Non-validating type assertion for Value
 *
 * @param {unknown} allegedValue
 * @returns {asserts allegedValue is Value}
 */
export const assertLooksLikeValue = allegedValue =>
  assert(
    looksLikeValue(allegedValue),
    X`value ${allegedValue} must be a Nat or an array`,
  );

/**
 * Non-validating type assertion for Brand
 *
 * @param {unknown} allegedBrand
 * @param {Details=} msg
 * @returns {asserts allegedBrand is Brand}
 */
export const assertLooksLikeBrand = (
  allegedBrand,
  msg = X`The brand ${allegedBrand} doesn't look like a brand.`,
) => assert(looksLikeBrand(allegedBrand), msg);
