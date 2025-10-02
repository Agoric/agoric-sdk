import { provideLazyMap } from './js-utils.js';

/**
 * @param {string} a
 * @param {string} b
 * @returns {-1 | 0 | 1}
 */
const compareNats = (a, b) => {
  // Default to IEEE 754 number arithmetic for speed, but fall back on bigint
  // arithmetic to resolve ties because big numbers can lose resolution
  // (sometimes even becoming infinite) and then ultimately on length to resolve
  // ties by ascending count of leading zeros.
  const diff = +a - +b;
  const finiteDiff =
    (Number.isFinite(diff) && diff) ||
    (a === b ? 0 : Number(BigInt(a) - BigInt(b)) || a.length - b.length);

  // @ts-expect-error this call really does return -1 | 0 | 1
  return Math.sign(finiteDiff);
};

// TODO: compareByCodePoints
// https://github.com/endojs/endo/pull/2008
// eslint-disable-next-line no-nested-ternary
const compareStrings = (a, b) => (a > b ? 1 : a < b ? -1 : 0);

const rCaptureDigits = /([0-9]+)/;

/**
 * Splitting by regular expression can be expensive; we don't want to repeat
 * that for every comparison against the same string.
 *
 * @type {Map<string, string[]>}
 */
const partsCache = new Map();

/**
 * Perform a multi-level natural-sort comparison, finding the decimal digit
 * sequences in each operand and comparing first by each ([possibly empty]
 * string prefix, integer) pair in turn, with a final comparision by string
 * suffix as necessary (e.g., sorting 'ko42' before 'ko100' as ['ko', 42] vs.
 * ['ko', 100] and 'parent1.child8' before 'parent1.child10' as ['parent', 1,
 * 'child', 8] vs. ['parent', 1, 'child', 10]).
 *
 * @param {string} a
 * @param {string} b
 * @returns {-1 | 0 | 1}
 */
export const naturalCompare = (a, b) => {
  // We want to maintain a cache only for the duration of each call to
  // array.sort, and leverage the synchronous nature of that method in the first
  // invocation of each turn (indicated by an empty cache) to schedule cache
  // clearing in the *next* turn.
  if (!partsCache.size) void Promise.resolve().then(() => partsCache.clear());

  const aParts = provideLazyMap(partsCache, a, () => a.split(rCaptureDigits));
  const bParts = provideLazyMap(partsCache, b, () => b.split(rCaptureDigits));

  // An even index corresponds with a string part; an odd one with a digit part.
  let i = 0;
  for (; i + 1 < aParts.length; i += 2) {
    if (i + 1 < bParts.length) {
      // Both `a` and `b` have a digit part here, but we compare the preceding
      // string part first in case those are unequal.
      const result =
        compareStrings(aParts[i], bParts[i]) ||
        compareNats(aParts[i + 1], bParts[i + 1]);
      if (result) return result;
    } else {
      // After a (possibly empty) common prefix, `a` has digits where `b` does
      // not, so we use string comparison of `${aString}${aDigits}` vs.
      // `${bString}`.
      return compareStrings(`${aParts[i]}${aParts[i + 1]}`, bParts[i]);
    }
  }
  if (bParts.length > aParts.length) {
    // `b` has digits where `a` does not.
    return compareStrings(aParts[i], `${bParts[i]}${bParts[i + 1]}`);
  }
  // If `a` and `b` differ, it's only in the final string suffix.
  return compareStrings(aParts[i], bParts[i]);
};
harden(naturalCompare);
