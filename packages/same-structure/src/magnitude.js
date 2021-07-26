// @ts-check

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import { passStyleOf, assertComparable } from '@agoric/marshal';

const { details: X, quote: q } = assert;

/**
 * @typedef { -1 | 0 | 1 } FullComparison
 * A comparison for elements of a full order.
 */

/**
 * @typedef { -1 | 0 | 1 | undefined } PartialComparison
 * A comparison for elements of a partial order.
 */

/**
 * @typedef { "lt" | "lte" | "eq" | "gte" | "gt" } RelationalOp
 */

/**
 * Magnitudes are partially ordered. (Are they a lattice?)
 * Magnitudes of two different passStyles are incommensurate.
 * Magnitudes within a fully ordered passStyle are always -1, 0, or 1.
 * Magnitudes within other passStyles may be incommensurate.
 * Incommesurate is indicated with `undefined`.
 * Within a passStyle, multiple values may be in an equivalence class,
 * in which case they compare 0.
 *
 * Note that `compareMagnitude(NaN, NaN) === 0`. This is necessary for
 * the order to b reflexive.
 *
 * Because it might return `undefined`, `compareMagnitude` *cannot* be used as
 * the comparison function for `Array.prototype.sort`.
 * See `compareMagnitudeStrict` and `compareFullOrder`.
 *
 * @param {Comparable} left
 * @param {Comparable} right
 * @returns {PartialComparison}
 */
export const compareMagnitude = (left, right) => {
  assertComparable(left);
  assertComparable(right);
  const passStyle = passStyleOf(left);
  if (passStyle !== passStyleOf(right)) {
    return undefined;
  }
  switch (passStyle) {
    case 'undefined':
    case 'null': {
      return 0;
    }
    case 'symbol':
    case 'remotable': {
      return left === right ? 0 : undefined;
    }
    case 'boolean':
    case 'bigint':
    case 'string': {
      // eslint-disable-next-line no-nested-ternary
      return left < right ? -1 : left > right ? 1 : 0;
    }
    case 'number': {
      if (Number.isNaN(left)) {
        return Number.isNaN(right) ? 0 : undefined;
      }
      if (Number.isNaN(right)) {
        return undefined;
      }
      // eslint-disable-next-line no-nested-ternary
      return left < right ? -1 : left > right ? 1 : 0;
    }
    case 'copyArray': {
      // lexicographic order generalized to partial orders
      for (let i = 0; i < Math.min(left.length, right.length); i += 1) {
        const c = compareMagnitude(left[i], right[i]);
        if (c !== 0) {
          return c;
        }
      }
      return compareMagnitude(left.length, right.length);
    }
    case 'copyRecord': {
      // something like lexicographic by sorted property names
      assert.fail(
        X`magnitude comparison of ${q(passStyle)} not yet implemented`,
      );
    }
    case 'copySet': {
      // subset
      assert.fail(
        X`magnitude comparison of ${q(passStyle)} not yet implemented`,
      );
    }
    case 'copyMap': {
      // something like lexicographic by sort order of keys
      assert.fail(
        X`magnitude comparison of ${q(passStyle)} not yet implemented`,
      );
    }
    default: {
      assert.fail(X`Unexpected passStyle ${q(passStyle)}`);
    }
  }
};
harden(compareMagnitude);

/**
 * Where magnitudes are ordered, the strict magnitude ordering agrees.
 * Otherwise, this comparison throws.
 *
 * `compareMagnitudeStrict` can be used as the comparison function for
 * `Array.prototype.sort`. If the array contains incommensurate elements,
 * sorting the array with this comparison will throw.
 * See `compareFullOrder`.
 *
 * @param {Comparable} left
 * @param {Comparable} right
 * @returns {FullComparison}
 */
export const compareMagnitudeStrict = (left, right) => {
  const comparison = compareMagnitude(left, right);
  assert(comparison !== undefined);
  return /** @type {FullComparison} */ (comparison);
};
harden(compareMagnitudeStrict);

/**
 * @param { RelationalOp } relationalOp
 * @param {PartialComparison} comp
 * @returns {boolean}
 */
export const opCompare = (relationalOp, comp) => {
  switch (relationalOp) {
    case 'lt': {
      return comp === -1;
    }
    case 'lte': {
      return comp === -1 || comp === 0;
    }
    case 'eq': {
      return comp === 0;
    }
    case 'gte': {
      return comp === 0 || comp === 1;
    }
    case 'gt': {
      return comp === 1;
    }
    default: {
      assert.fail(X`unrecognized relational op ${q(relationalOp)}`);
    }
  }
};
harden(opCompare);
