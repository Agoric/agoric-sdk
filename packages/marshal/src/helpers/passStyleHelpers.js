// @ts-check

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import '../types.js';
import './internal-types.js';
/**
 * TODO Why do I need these?
 *
 * @typedef {import('./internal-types.js').Checker} Checker
 */
import '@agoric/assert/exported.js';

const { details: X, quote: q } = assert;
const { hasOwnProperty: objectHasOwnProperty } = Object;
const { apply } = Reflect;
const { isArray } = Array;

export const hasOwnPropertyOf = (obj, prop) =>
  apply(objectHasOwnProperty, obj, [prop]);
harden(hasOwnPropertyOf);

export const isPrimitive = val => Object(val) !== val;
harden(isPrimitive);

export const PASS_STYLE = Symbol.for('passStyle');

/**
 * For a function to be a valid method, it must not be passable.
 * Otherwise, we risk confusing pass-by-copy data carrying
 * far functions with attempts at far objects with methods.
 *
 * TODO HAZARD Because we check this on the way to hardening a remotable,
 * we cannot yet check that `func` is hardened. However, without
 * doing so, it's inheritance might change after the `PASS_STYLE`
 * check below.
 *
 * @param {*} func
 * @returns {boolean}
 */
export const canBeMethod = func =>
  typeof func === 'function' && !(PASS_STYLE in func);
harden(canBeMethod);

/**
 * Below we have a series of predicate functions and their (curried) assertion
 * functions. The semantics of the assertion function is just to assert that
 * the corresponding predicate function would have returned true. But it
 * reproduces the internal tests so failures can give a better error message.
 *
 * @type {Checker}
 */
export const assertChecker = (cond, details) => {
  assert(cond, details);
  return true;
};
harden(assertChecker);

/**
 * @param {{ [PASS_STYLE]: string }} tagRecord
 * @param {PassStyle} passStyle
 * @param {Checker} [check]
 * @returns {boolean}
 */
export const checkTagRecord = (tagRecord, passStyle, check = x => x) => {
  return (
    check(
      typeof tagRecord === 'object',
      X`A non-object cannot be a tagRecord: ${tagRecord}`,
    ) &&
    check(
      !isArray(tagRecord),
      X`An array cannot be a tagRecords: ${tagRecord}`,
    ) &&
    check(tagRecord !== null, X`null cannot be a tagRecord`) &&
    check(
      hasOwnPropertyOf(tagRecord, PASS_STYLE),
      X`A tagRecord must have a [PASS_STYLE] property: ${tagRecord}`,
    ) &&
    check(
      tagRecord[PASS_STYLE] === passStyle,
      X`Expected ${q(passStyle)}, not ${q(
        tagRecord[PASS_STYLE],
      )}: ${tagRecord}`,
    )
  );
};
harden(checkTagRecord);
