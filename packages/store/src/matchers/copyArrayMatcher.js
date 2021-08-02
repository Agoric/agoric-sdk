// @ts-check

import { compareRank, everyPassableChild } from '@agoric/marshal';
// eslint-disable-next-line import/no-cycle
import {
  isKey,
  keyStyleOf,
  isPattern,
  compareKeys,
  match,
  getRankCover,
} from './compareKeys';

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import './internal-types.js';
/**
 * @typedef {import('./internal-types.js').Matcher} Matcher
 */

/** @type {Matcher} */
export const CopyArrayMatcher = harden({
  passStyleName: 'copyArray',
  keyStyleName: 'copyArray',
  patternStyleName: 'copyArray',

  doIsKey: array => everyPassableChild(array, isKey),

  doIsPattern: array => everyPassableChild(array, isPattern),

  doCompareKeys: (leftArray, rightArray) => {
    // Lexicographic
    const len = Math.min(leftArray.length, rightArray.length);
    for (let i = 0; i < len; i += 1) {
      const result = compareKeys(leftArray[i], rightArray[i]);
      if (result !== 0) {
        return result;
      }
    }
    // If all matching elements are sameKey, then according to their lengths
    return compareRank(leftArray.length, rightArray.length);
  },

  doMatch: (arrayPattern, specimen) => {
    if (keyStyleOf(specimen) !== 'copyArray') {
      return false;
    }
    if (arrayPattern.length !== specimen.length) {
      return false;
    }
    for (let i = 0; i < arrayPattern.length; i += 1) {
      if (!match(arrayPattern[i], specimen[i])) {
        return false;
      }
    }
    return true;
  },

  doGetRankCover: arrayPattern => {
    const covers = arrayPattern.map(getRankCover);
    return harden([
      covers.map(cover => cover[0]),
      covers.map(cover => cover[1]),
    ]);
  },
});
