// @ts-check

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import {
  assertChecker,
  everyPassableChild,
  passStyleOf,
} from '@agoric/marshal';
import { isKey, keyKindOf } from '../keys/keyKind';

const { details: X, quote: q } = assert;

/** @type {WeakMap<Pattern, PatternKind>} */
const patternKindMemo = new WeakMap();

/**
 * @param {Passable} val
 * @param {Checker=} check
 * @returns {PatternKind=}
 */
const checkPatternKindOf = (val, check = x => x) => {
  if (isKey(val)) {
    // Every key is a pattern that matches exactly itself.
    // All non-primitive keys are already memoized in the keyCache,
    // so no reason to redundantly memoize it in the patternCache.
    // This case also takes care of all primitives.
    return keyKindOf(val);
  }
  if (patternKindMemo.has(val)) {
    return patternKindMemo.get(val);
  }
  // eslint-disable-next-line no-use-before-define
  const patternKind = patternKindOfInternal(val, check);
  if (patternKind !== undefined) {
    // Don't cache the undefined cases, so that if it is tried against
    // with `assertChecker` it'll throw a diagnostic again
    patternKindMemo.set(val, patternKind);
  }
  return patternKind;
};

/**
 * @param {Passable} val
 * @param {Checker=} check
 * @returns {PatternKind=}
 */
const patternKindOfInternal = (val, check = x => x) => {
  const passStyle = passStyleOf(val);

  switch (passStyle) {
    case 'copyArray':
    case 'copyRecord': {
      const checkIsPattern = child =>
        checkPatternKindOf(child, check) !== undefined;
      if (everyPassableChild(val, checkIsPattern)) {
        return passStyle;
      }
      return undefined;
    }
    case 'tagged': {
      // TODO implement
      assert.fail(X`tagged patterns not yet implemented: ${val}`);
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
 * @param {Pattern} val
 * @returns {PatternKind}
 */
export const patternKindOf = val =>
  // @ts-ignore When assertChecker is provided, it won't return undefined.
  checkPatternKindOf(val, assertChecker);
harden(patternKindOf);

/**
 * @param {Passable} val
 * @returns {boolean}
 */
export const isPattern = val => checkPatternKindOf(val) !== undefined;
harden(isPattern);

/**
 * @param {Pattern} val
 */
export const assertPattern = val => {
  checkPatternKindOf(val, assertChecker);
};
harden(assertPattern);
