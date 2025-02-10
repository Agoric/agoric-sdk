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

const rPrefixedDigits = /^(\D*)(\d+)(\D.*|)/s;

/**
 * Perform a single-level natural-sort comparison, finding the first decimal
 * digit sequence in each operand and comparing first by the (possibly empty)
 * preceding prefix as strings, then by the digits as integers, then by any
 * following suffix (e.g., sorting 'ko42' before 'ko100' as ['ko', 42] vs.
 * ['ko', 100]).
 *
 * @param {string} a
 * @param {string} b
 * @returns {-1 | 0 | 1}
 */
export const naturalCompare = (a, b) => {
  const [_a, aPrefix, aDigits, aSuffix] = rPrefixedDigits.exec(a) || [];
  if (aPrefix !== undefined) {
    const [_b, bPrefix, bDigits, bSuffix] = rPrefixedDigits.exec(b) || [];
    if (bPrefix === aPrefix) {
      return compareNats(aDigits, bDigits) || compareStrings(aSuffix, bSuffix);
    }
  }
  return compareStrings(a, b);
};
harden(naturalCompare);
