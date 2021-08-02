// @ts-check

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import {
  assertChecker,
  everyPassableChild,
  getTag,
  isObject,
  passStyleOf,
} from '@agoric/marshal';

const { details: X, quote: q } = assert;

/**
 * @param {Passable} s
 * @param {Checker=} check
 * @returns {boolean}
 */
const checkCopySet = (s, check = x => x) => {
  // TODO implement
  return check(false, X`copySet validation not yet implemented: ${s}`);
};

/**
 * checkCopySet does not need a separate memo because all copySets are keys,
 * and so the `keyKindMemo` below does all the work. But a copyMap may or
 * may not be a key, so we separately memoize the judgement that something
 * is a non-key copyMap. The keys of a copyMap must be keys, but
 * the values can be any passable. If any value is a non-key passable, then
 * the copyMap is not a key and should be stored in this memo instead.
 *
 * @type {WeakSet<CopyMap>}
 */
const nonKeyCopyMapMemo = new WeakSet();

/**
 * To avoid duplicate validation work, we use this one internal function to
 * validate both whether `val` is a valid `copyMap` and whether `m` is a
 * valid `copyMap` that is also a key.
 *    * If it is a valid `copyMap` and a valid key, then we `return true`.
 *    * Otherwise, if it is a valid `copyMap` then we store it in
 *      the `nonKeyCopyMapMemo` and `return check(false, ...)`.
 *    * Otherwise, we simply `return check(false,...)`.
 *
 * @param {Passable} m
 * @param {Checker=} check
 * @returns {boolean}
 */
const checkCopyMapIsKey = (m, check = x => x) => {
  if (nonKeyCopyMapMemo.has(m)) {
    return check(
      false,
      X`This copyMap is not a key because it contains a non-key value: ${m}`,
    );
  }
  // TODO implement
  return check(false, X`copyMap validation not yet implemented: ${m}`);
};

/** @type {WeakMap<Key, KeyKind>} */
const keyKindMemo = new WeakMap();

/**
 * @param {Passable} val
 * @param {Checker=} check
 * @returns {KeyKind=}
 */
const checkKeyKindOf = (val, check = x => x) => {
  if (!isObject(val)) {
    // @ts-ignore PassStyle and KeyStyle are the same for primitives
    return passStyleOf(val);
  }
  if (keyKindMemo.has(val)) {
    return keyKindMemo.get(val);
  }
  // eslint-disable-next-line no-use-before-define
  const keyKind = keyKindOfInternal(val, check);
  if (keyKind !== undefined) {
    // Don't cache the undefined cases, so that if it is tried against
    // with `assertChecker` it'll throw a diagnostic again
    keyKindMemo.set(val, keyKind);
  }
  return keyKind;
};

/**
 * @param {Passable} val
 * @param {Checker=} check
 * @returns {KeyKind=}
 */
const keyKindOfInternal = (val, check = x => x) => {
  const passStyle = passStyleOf(val);
  switch (passStyle) {
    case 'copyRecord':
    case 'copyArray': {
      const checkIsKey = child => checkKeyKindOf(child, check) !== undefined;
      if (everyPassableChild(val, checkIsKey)) {
        // A copyRecord or copyArray is a key iff all its children are keys
        return passStyle;
      }
      return undefined;
    }
    case 'tagged': {
      const tag = getTag(val);
      switch (tag) {
        case 'copySet': {
          if (checkCopySet(val, check)) {
            return 'copySet';
          }
          return undefined;
        }
        case 'copyMap': {
          if (checkCopyMapIsKey(val, check)) {
            return 'copyMap';
          }
          return undefined;
        }
        default: {
          check(false, X`A passable tagged ${q(tag)} is not a key: ${val}`);
          return undefined;
        }
      }
    }
    case 'remotable': {
      // All remotables are keys.
      return 'remotable';
    }
    case 'error':
    case 'promise': {
      check(false, X`A ${q(passStyle)} cannot be a key`);
      return undefined;
    }
    default: {
      // Unexpected tags are just non-keys, but an unexpected passStyle
      // is always an error.
      assert.fail(X`unexpected passStyle ${q(passStyle)}: ${val}`);
    }
  }
};

/**
 * @param {Key} val
 * @returns {KeyKind}
 */
export const keyKindOf = val =>
  // @ts-ignore When assertChecker is provided, it won't return undefined.
  checkKeyKindOf(val, assertChecker);
harden(keyKindOf);

/**
 * @param {Passable} val
 * @returns {boolean}
 */
export const isKey = val => checkKeyKindOf(val) !== undefined;
harden(isKey);

/**
 * @param {Key} val
 */
export const assertKey = val => {
  checkKeyKindOf(val, assertChecker);
};
harden(assertKey);
