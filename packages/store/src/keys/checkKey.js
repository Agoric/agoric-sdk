// @ts-check

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import {
  assertChecker,
  assertPassable,
  getTag,
  isObject,
  passStyleOf,
} from '@agoric/marshal';
import { checkCopySet, everyCopySetKey } from './copySet.js';
import { checkCopyMap, everyCopyMapKey, everyCopyMapValue } from './copyMap.js';

const { details: X, quote: q } = assert;

// ////////////////// Primitive and Scalar keys ////////////////////////////////

/**
 * @param {Passable} val
 * @param {Checker=} check
 * @returns {boolean}
 */
const checkPrimitiveKey = (val, check = x => x) => {
  if (isObject(val)) {
    return check(false, X`A ${q(typeof val)} cannot be a primitive: ${val}`);
  }
  // TODO There is not yet a checkPassable, but perhaps there should be.
  // If that happens, we should call it here instead.
  assertPassable(val);
  return true;
};

/**
 * @param {Passable} val
 * @returns {boolean}
 */
export const isPrimitiveKey = val => checkPrimitiveKey(val);
harden(isPrimitiveKey);

/**
 * @param {Passable} val
 * @returns {void}
 */
export const assertPrimitiveKey = val => {
  checkPrimitiveKey(val, assertChecker);
};
harden(assertPrimitiveKey);

/**
 * @param {Passable} val
 * @param {Checker=} check
 * @returns {boolean}
 */
export const checkScalarKey = (val, check = x => x) => {
  if (isPrimitiveKey(val)) {
    return true;
  }
  const passStyle = passStyleOf(val);
  return check(
    passStyle === 'remotable',
    X`A ${q(passStyle)} cannot be a scalar key: ${val}`,
  );
};

/**
 * @param {Passable} val
 * @returns {boolean}
 */
export const isScalarKey = val => checkScalarKey(val);
harden(isScalarKey);

/**
 * @param {Passable} val
 * @returns {void}
 */
export const assertScalarKey = val => {
  checkScalarKey(val, assertChecker);
};
harden(assertScalarKey);

// ///////////////////////////// Keys //////////////////////////////////////////

/**
 * @param {Passable} val
 * @param {Checker=} check
 * @returns {boolean}
 */
const checkKeyInternal = (val, check = x => x) => {
  // eslint-disable-next-line no-use-before-define
  const checkIt = child => checkKey(child, check);

  const passStyle = passStyleOf(val);
  switch (passStyle) {
    case 'copyRecord': {
      // A copyRecord is a key iff all its children are keys
      return Object.values(val).every(checkIt);
    }
    case 'copyArray': {
      // A copyArray is a key iff all its children are keys
      return val.every(checkIt);
    }
    case 'tagged': {
      const tag = getTag(val);
      switch (tag) {
        case 'copySet': {
          return (
            checkCopySet(val, check) &&
            // For a copySet to be a key, all its elements must be keys
            everyCopySetKey(val, checkIt)
          );
        }
        case 'copyMap': {
          return (
            checkCopyMap(val, check) &&
            // For a copyMap to be a key, all its keys and values must
            // be keys.
            everyCopyMapKey(val, checkIt) &&
            everyCopyMapValue(val, checkIt)
          );
        }
        default: {
          return check(
            false,
            X`A passable tagged ${q(tag)} is not a key: ${val}`,
          );
        }
      }
    }
    case 'remotable': {
      // All remotables are keys.
      return true;
    }
    case 'error':
    case 'promise': {
      return check(false, X`A ${q(passStyle)} cannot be a key`);
    }
    default: {
      // Unexpected tags are just non-keys, but an unexpected passStyle
      // is always an error.
      assert.fail(X`unexpected passStyle ${q(passStyle)}: ${val}`);
    }
  }
};

/** @type {WeakSet<Key>} */
const keyMemo = new WeakSet();

/**
 * @param {Passable} val
 * @param {Checker=} check
 * @returns {boolean}
 */
export const checkKey = (val, check = x => x) => {
  if (isPrimitiveKey(val)) {
    return true;
  }
  if (!isObject(val)) {
    // TODO There is not yet a checkPassable, but perhaps there should be.
    // If that happens, we should call it here instead.
    assertPassable(val);
    return true;
  }
  if (keyMemo.has(val)) {
    return true;
  }
  const result = checkKeyInternal(val, check);
  if (result) {
    // Don't cache the undefined cases, so that if it is tried again
    // with `assertChecker` it'll throw a diagnostic again
    keyMemo.add(val);
  }
  // Note that we do not memoize a negative judgement, so that if it is tried
  // again with a checker, it will still produce a useful diagnostic.
  return result;
};
harden(checkKey);

/**
 * @param {Passable} val
 * @returns {boolean}
 */
export const isKey = val => checkKey(val);
harden(isKey);

/**
 * @param {Key} val
 */
export const assertKey = val => {
  checkKey(val, assertChecker);
};
harden(assertKey);
