// @ts-check

import { passStyleOf, isComparable, assertComparable } from '@agoric/marshal';
import { assert, details as X, q } from '@agoric/assert';

const { is, fromEntries, getOwnPropertyNames } = Object;

const { ownKeys } = Reflect;

/**
 * This is the equality comparison used by JavaScript's Map and Set
 * abstractions, where NaN is the same as NaN and -0 is the same as
 * 0. Marshal serializes -0 as zero, so the semantics of our distributed
 * object system does not distinguish 0 from -0.
 *
 * `sameValueZero` is the EcmaScript spec name for this equality comparison,
 * but TODO we need a better name for the API.
 *
 * @param {any} x
 * @param {any} y
 * @returns {boolean}
 */
export const sameValueZero = (x, y) => x === y || is(x, y);
harden(sameValueZero);

/**
 * A *passable* is something that may be marshalled. It consists of an acyclic
 * graph representing a tree of pass-by-copy data terminating in leaves of
 * passable non-pass-by-copy data. These leaves may be promises, or
 * pass-by-presence objects. A *comparable* is a passable whose leaves
 * contain no promises. Two comparables can be synchronously compared
 * for structural equivalence.
 *
 * We say that a function *reveals* an X when it returns either an X
 * or a promise for an X.
 *
 * Given a passable, reveal a corresponding comparable, where each
 * leaf promise of the passable has been replaced with its
 * corresponding comparable, recursively.
 *
 * @param {Passable} passable
 * @returns {import('@agoric/eventual-send').ERef<Comparable>}
 */
export const allComparable = passable => {
  if (isComparable(passable)) {
    // Causes deep memoization, so is amortized fast.
    return passable;
  }
  // Below, we only need to deal with the cases where passable may not
  // be comparable.
  const passStyle = passStyleOf(passable);
  switch (passStyle) {
    case 'promise': {
      return passable.then(nonp => allComparable(nonp));
    }
    case 'copyArray': {
      const valPs = passable.map(p => allComparable(p));
      return Promise.all(valPs).then(vals => harden(vals));
    }
    case 'copyRecord': {
      const names = getOwnPropertyNames(passable);
      const valPs = names.map(name => allComparable(passable[name]));
      return Promise.all(valPs).then(vals =>
        harden(fromEntries(vals.map((val, i) => [names[i], val]))),
      );
    }
    case 'copySet':
    case 'copyMap': {
      assert.fail(X`${q(passStyle)} is not yet fully implemented: ${passable}`);
    }
    case 'copyError': {
      assert.fail(
        X`Errors are passable but no longer comparable: ${passable}`,
        TypeError,
      );
    }
    case 'patternNode': {
      assert.fail(X`PatternNodes are not comparable: ${passable}`);
    }
    default: {
      assert.fail(X`Unexpected passStyle: ${q(passStyle)}`, TypeError);
    }
  }
};
harden(allComparable);

/**
 * This internal recursion may assume that `left` and `right` and
 * Comparables, since `sameKey` guards that, and the guarantee is
 * deep.
 *
 * @param {Comparable} left
 * @param {Comparable} right
 * @returns {boolean}
 */
const sameKeyRecur = (left, right) => {
  const leftStyle = passStyleOf(left);
  if (leftStyle !== passStyleOf(right)) {
    return false;
  }
  switch (leftStyle) {
    case 'null':
    case 'undefined':
    case 'string':
    case 'boolean':
    case 'number':
    case 'bigint':
    case 'remotable': {
      return sameValueZero(left, right);
    }
    case 'copyArray': {
      if (left.length !== right.length) {
        return false;
      }
      return left.every((v, i) => sameKeyRecur(v, right[i]));
    }
    case 'copyRecord': {
      const leftNames = ownKeys(left);
      if (leftNames.length !== ownKeys(right).length) {
        return false;
      }
      return leftNames.every(name => sameKeyRecur(left[name], right[name]));
    }
    case 'copySet':
    case 'copyMap': {
      assert.fail(X`${q(leftStyle)} is not fully implemented`);
    }
    default: {
      assert.fail(X`Unexpected passStyle ${leftStyle}`, TypeError);
    }
  }
};

/**
 * Are left and right structurally equivalent comparables? This
 * compares pass-by-copy data deeply until non-pass-by-copy values are
 * reached. The non-pass-by-copy values at the leaves of the
 * comparison may only be pass-by-presence objects. If they are
 * anything else, including promises, throw an error.
 *
 * Pass-by-presence objects compare identities.
 *
 * @param {Comparable} left
 * @param {Comparable} right
 * @returns {boolean}
 */
export const sameKey = (left, right) => {
  assertComparable(left);
  assertComparable(right);
  return sameKeyRecur(left, right);
};
harden(sameKey);
