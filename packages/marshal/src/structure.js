// @ts-check

import { assert, details as X, q } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { getTag, isPrimitive } from './helpers/passStyle-helpers.js';
import { makeCopyTagged } from './makeTagged.js';
import { passStyleOf, everyPassableChild } from './passStyleOf.js';

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
 * Do a deep copy of the object, handling Proxies and recursion.
 * The resulting copy is guaranteed to be pure data, as well as hardened.
 * Such a hardened, pure copy cannot be used as a communications path.
 *
 * @template {OnlyData} T
 * @param {T} val input value.  NOTE: Must be hardened!
 * @returns {T} pure, hardened copy
 */
export const pureCopy = val => {
  // passStyleOf now asserts that val has no pass-by-copy cycles.
  const passStyle = passStyleOf(val);
  switch (passStyle) {
    case 'bigint':
    case 'boolean':
    case 'null':
    case 'number':
    case 'string':
    case 'undefined':
    case 'symbol':
      return val;

    case 'copyRecord':
    case 'copyArray': {
      const obj = /** @type {Object} */ (val);

      // Create a new identity.
      const copy = /** @type {T} */ (passStyle === 'copyArray' ? [] : {});

      // Make a deep copy on the new identity.
      // Object.entries(obj) takes a snapshot (even if a Proxy).
      // Since we already know it is a copyRecord or copyArray, we
      // know that Object.entries is safe enough. On a copyRecord it
      // will represent all the own properties. On a copyArray it
      // will represent all the own properties except for the length.
      Object.entries(obj).forEach(([prop, value]) => {
        copy[prop] = pureCopy(value);
      });
      return harden(copy);
    }

    case 'copyTagged': {
      const tagged = /** @type {CopyTagged} */ (val);
      return makeCopyTagged(getTag(tagged), pureCopy(tagged.payload));
    }

    case 'remotable':
    case 'error':
    case 'promise':
    case 'metaTagged': {
      assert.fail(X`${q(passStyle)} in not OnlyData: ${val}`, TypeError);
    }

    default:
      assert.fail(
        X`Input value ${q(passStyle)} is not recognized as data`,
        TypeError,
      );
  }
};
harden(pureCopy);

/**
 * TODO If the path to the non-structure becomes an important diagnostic,
 * consider factoring this into a checkStructure that also takes
 * a `path` and a `check` function.
 *
 * @param {Passable} passable
 * @returns {boolean}
 */
const isStructureInternal = passable => {
  const passStyle = passStyleOf(passable);
  switch (passStyle) {
    case 'undefined':
    case 'null':
    case 'boolean':
    case 'number':
    case 'bigint':
    case 'string':
    case 'symbol': {
      return true;
    }

    case 'remotable':
    case 'copyRecord':
    case 'copyArray':
    case 'copyTagged': {
      // eslint-disable-next-line no-use-before-define
      return everyPassableChild(passable, isStructure);
    }

    // Errors are no longer structure
    case 'error':
    case 'promise':
    case 'metaTagged': {
      return false;
    }
    default: {
      assert.fail(X`Unrecognized passStyle: ${q(passStyle)}`, TypeError);
    }
  }
};

// Like the passStyleCache. An optimization only. Works because comparability
// is guaranteed stable.
const structureCache = new WeakMap();

/**
 * @param {Passable} passable
 * @returns {boolean}
 */
export const isStructure = passable => {
  const isObject = !isPrimitive(passable);
  if (isObject) {
    if (structureCache.has(passable)) {
      return structureCache.get(passable);
    }
  }
  const result = isStructureInternal(passable);
  if (isObject) {
    structureCache.set(passable, result);
  }
  return result;
};
harden(isStructure);

/**
 * @param {Structure} structure
 */
export const assertStructure = structure =>
  assert(isStructure(structure), X`Must be structure: ${structure}`, TypeError);
harden(assertStructure);

/**
 * A *passable* is something that may be marshalled. It consists of an acyclic
 * graph representing a tree of pass-by-copy data terminating in leaves of
 * passable non-pass-by-copy data. These leaves may be promises, or
 * pass-by-presence objects. A *structure* is a passable whose leaves
 * contain no promises. Two structures can be synchronously compared
 * for structural equivalence.
 *
 * We say that a function *reveals* an X when it returns either an X
 * or a promise for an X.
 *
 * Given a passable, reveal a corresponding structure, where each
 * leaf promise of the passable has been replaced with its
 * corresponding structure, recursively.
 *
 * @param {Passable} passable
 * @returns {import('@agoric/eventual-send').ERef<Structure>}
 */
export const fulfillToStructure = passable => {
  if (isStructure(passable)) {
    // Causes deep memoization, so is amortized fast.
    return passable;
  }
  // Below, we only need to deal with the cases where passable may not
  // be structure.
  const passStyle = passStyleOf(passable);
  switch (passStyle) {
    case 'promise': {
      return E.when(passable, nonp => fulfillToStructure(nonp));
    }
    case 'copyRecord': {
      const names = getOwnPropertyNames(passable);
      const valPs = names.map(name => fulfillToStructure(passable[name]));
      return E.when(Promise.all(valPs), vals =>
        harden(fromEntries(vals.map((val, i) => [names[i], val]))),
      );
    }
    case 'copyArray': {
      const valPs = passable.map(p => fulfillToStructure(p));
      return E.when(Promise.all(valPs), vals => harden(vals));
    }
    case 'copyTagged': {
      return E.when(fulfillToStructure(passable.payload), payload =>
        makeCopyTagged(getTag(passable), payload),
      );
    }
    case 'error': {
      assert.fail(
        X`Errors are passable but no longer structure: ${passable}`,
        TypeError,
      );
    }
    default: {
      assert.fail(X`PassStyle ${q(passStyle)} cannot be structure`, TypeError);
    }
  }
};
harden(fulfillToStructure);

/**
 * This internal recursion may assume that `left` and `right` are
 * Structures, since `sameStructure` guards that, and the guarantee is
 * deep.
 *
 * @param {Structure} left
 * @param {Structure} right
 * @returns {boolean}
 */
const sameStructureRecur = (left, right) => {
  const leftStyle = passStyleOf(left);
  if (leftStyle !== passStyleOf(right)) {
    return false;
  }
  switch (leftStyle) {
    case 'undefined':
    case 'null':
    case 'boolean':
    case 'number':
    case 'bigint':
    case 'string':
    case 'symbol':
    case 'remotable': {
      return sameValueZero(left, right);
    }
    case 'copyRecord': {
      const leftNames = ownKeys(left);
      if (leftNames.length !== ownKeys(right).length) {
        return false;
      }
      return leftNames.every(name =>
        sameStructureRecur(left[name], right[name]),
      );
    }
    case 'copyArray': {
      if (left.length !== right.length) {
        return false;
      }
      return left.every((v, i) => sameStructureRecur(v, right[i]));
    }
    case 'copyTagged': {
      return (
        getTag(left) === getTag(right) &&
        sameStructureRecur(left.payload, right.payload)
      );
    }
    default: {
      assert.fail(X`Unexpected passStyle ${leftStyle}`, TypeError);
    }
  }
};

/**
 * Are left and right structurally equivalent structures? This
 * compares pass-by-copy data deeply until non-pass-by-copy values are
 * reached. The non-pass-by-copy values at the leaves of the
 * comparison may only be pass-by-presence objects. If they are
 * anything else, including promises, throw an error.
 *
 * Pass-by-presence objects compare identities.
 *
 * @param {Structure} left
 * @param {Structure} right
 * @returns {boolean}
 */
export const sameStructure = (left, right) => {
  assertStructure(left);
  assertStructure(right);
  return sameStructureRecur(left, right);
};
harden(sameStructure);
