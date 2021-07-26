// @ts-check

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import { passStyleOf } from '@agoric/marshal';
import { compareMagnitude, compareMagnitudeStrict } from './magnitude.js';

const { details: X, quote: q } = assert;

/**
 * TODO: Why is this necessary?
 *
 * @typedef {import('./magnitude.js').FullComparison} FullComparison
 */

/**
 * Where magnitudes are ordered, aside from sets, the full order agrees.
 * Otherwise, the full order picks an order which is sometimes
 * arbitrary but always deterministic.
 *
 * `compareFullOrder` can be used as the comparison function for
 * `Array.prototype.sort`.
 *
 * @param {Comparable} left
 * @param {Comparable} right
 * @returns {FullComparison}
 */
export const compareFullOrder = (left, right) => {
  const leftStyle = passStyleOf(left);
  const rightStyle = passStyleOf(right);
  if (leftStyle !== rightStyle) {
    // TODO define a more intuitive order among the styles
    return compareMagnitudeStrict(left, right);
  }
  if (leftStyle !== 'copySet') {
    const comparison = compareMagnitude(left, right);
    if (comparison !== undefined) {
      return comparison;
    }
  }
  switch (leftStyle) {
    case 'symbol':
    case 'remotable': {
      // All symbols are in the same equivalence class.
      // All remotables are in the same equivalence class.
      return 0;
    }
    case 'number': {
      // exactly one was a NaN. NaN is after all other numbers.
      if (Number.isNaN(left)) {
        assert(!Number.isNaN(right));
        return 1;
      }
      assert(Number.isNaN(right));
      return -1;
    }
    case 'copyArray': {
      // lexicographic order
      for (let i = 0; i < Math.min(left.length, right.length); i += 1) {
        const c = compareFullOrder(left[i], right[i]);
        if (c !== 0) {
          return c;
        }
      }
      return compareFullOrder(left.length, right.length);
    }
    case 'copyRecord': {
      // something like lexicographic by sorted property names
      assert.fail(X`order comparison of ${q(leftStyle)} not yet implemented`);
    }
    case 'copySet': {
      // unclear.
      assert.fail(X`order comparison of ${q(leftStyle)} not yet implemented`);
    }
    case 'copyMap': {
      // something like lexicographic by sort order of keys
      assert.fail(X`order comparison of ${q(leftStyle)} not yet implemented`);
    }
    default: {
      assert.fail(X`Unexpected passStyle ${q(leftStyle)}`);
    }
  }
};
