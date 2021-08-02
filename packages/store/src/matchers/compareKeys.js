// @ts-check

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import {
  passStyleOf,
  isPrimitive,
  FullRankCover,
  compareRank,
  makeCopyTagged,
  getPassStyleCover,
} from '@agoric/marshal';

// eslint-disable-next-line import/no-cycle
import { CopyArrayMatcher } from './copyArrayMatcher.js';
// import { CopySetMatcher } from './copySetMatcher.js';
// import { CopyMapMatcher } from './copyMapMatcher.js';
// import { PatternNodeMatchers } from './patternNodeMatchers.js';

/**
 * @param {Passable} passable
 * @returns {boolean}
 */
export const isKey = passable =>
  // eslint-disable-next-line no-use-before-define
  keyStyleOf(passable) !== undefined;
harden(isKey);

const keyStyleOfCache = new WeakMap();

/**
 * @param {Passable} passable
 * @returns {KeyStyle=}
 */
export const keyStyleOf = passable => {
  const passStyle = passStyleOf(passable);
  if (isPrimitive(passable)) {
    // TODO reconsider whether NaN should be a key
    return /** @type {KeyStyle} */ (passStyle);
  }
  if (keyStyleOfCache.has(passable)) {
    return keyStyleOfCache.get(passable);
  }
  let keyStyle;
  switch (passStyleOf(passable)) {
    case 'copyArray': {
      if (CopyArrayMatcher.doIsKey(passable)) {
        keyStyle = CopyArrayMatcher.keyStyleName;
      }
      break;
    }
    default: {
      break;
    }
  }
  keyStyleOfCache.set(passable, keyStyle);
  return keyStyle;
};
harden(keyStyleOf);

/**
 * @param {Passable} passable
 * @returns {boolean}
 */
export const isPattern = passable =>
  // eslint-disable-next-line no-use-before-define
  patternStyleOf(passable) !== undefined;
harden(isPattern);

const patternStyleOfCache = new WeakMap();

/**
 * @param {Passable} passable
 * @returns {PatternStyle=}
 */
export const patternStyleOf = passable => {
  const passStyle = passStyleOf(passable);
  if (isPrimitive(passable)) {
    // TODO reconsider whether NaN should be a pattern
    return /** @type {PatternStyle} */ (passStyle);
  }
  if (patternStyleOfCache.has(passable)) {
    return patternStyleOfCache.get(passable);
  }
  let patternStyle;
  switch (passStyle) {
    case 'copyArray': {
      if (CopyArrayMatcher.doIsKey(passable)) {
        patternStyle = CopyArrayMatcher.patternStyleName;
      }
      break;
    }
    default: {
      break;
    }
  }
  patternStyleOfCache.set(passable, patternStyle);
  return patternStyle;
};
harden(patternStyleOf);

/**
 * @param {Key} left
 * @param {Key} right
 * @returns {-1 | 0 | 1 | undefined}
 */
export const compareKeys = (left, right) => {
  const leftKeyStyle = keyStyleOf(left);
  const rightKeyStyle = keyStyleOf(right);
  assert(leftKeyStyle !== undefined);
  assert(rightKeyStyle !== undefined);
  if (leftKeyStyle !== rightKeyStyle) {
    // Different keyStyles are incommensurate
    return undefined;
  }
  switch (leftKeyStyle) {
    case 'undefined':
    case 'null':
    case 'boolean':
    case 'bigint':
    case 'string': {
      // for these, keys compare the same as rank
      return compareRank(left, right);
    }
    case 'number': {
      const rankComp = compareRank(left, right);
      if (rankComp === 0) {
        return 0;
      }
      if (Number.isNaN(left) || Number.isNaN(right)) {
        // NaN is equal to itself, but incommensurate with everything else
        assert(!Number.isNaN(left) || !Number.isNaN(right));
        return undefined;
      }
      return rankComp;
    }
    case 'symbol':
    case 'remotable': {
      if (left === right) {
        return 0;
      }
      return undefined;
    }
    case 'copyArray': {
      return CopyArrayMatcher.doCompareKeys(left, right);
    }
    default: {
      return undefined;
    }
  }
};
harden(compareKeys);

export const sameKey = (left, right) => compareKeys(left, right) === 0;
harden(sameKey);

/**
 * @param {Pattern} pattern
 * @param {Passable} specimen
 * @returns {boolean}
 */
export const match = (pattern, specimen) => {
  if (isKey(pattern)) {
    return isKey(specimen) && sameKey(pattern, specimen);
  }
  const patternStyle = patternStyleOf(pattern);
  switch (patternStyle) {
    case 'copyArray': {
      return CopyArrayMatcher.doMatch(pattern, specimen);
    }
    default: {
      return false;
    }
  }
};
harden(match);

/**
 * @param {Pattern} pattern
 * @returns {RankCover}
 */
export const getRankCover = pattern => {
  if (isKey(pattern)) {
    return harden([pattern, pattern]);
  }
  const patternStyle = patternStyleOf(pattern);
  switch (patternStyle) {
    case 'copyArray': {
      return CopyArrayMatcher.doGetRankCover(pattern);
    }
    default: {
      return FullRankCover;
    }
  }
};
harden(getRankCover);

/**
 * @param {KeyStyle} keyStyle
 * @returns {RankCover}
 */
export const getKeyStyleCover = keyStyle => {
  switch (keyStyle) {
    case 'undefined':
    case 'null':
    case 'boolean':
    case 'number':
    case 'bigint':
    case 'string':
    case 'symbol':
    case 'copyRecord':
    case 'copyArray':
    case 'remotable': {
      return getPassStyleCover(keyStyle);
    }
    case 'copySet':
    case 'copyMap': {
      return harden([
        makeCopyTagged(keyStyle, null),
        makeCopyTagged(keyStyle, undefined),
      ]);
    }
    default: {
      return FullRankCover;
    }
  }
};
harden(getKeyStyleCover);
