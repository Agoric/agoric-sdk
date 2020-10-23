// @ts-check

import { passStyleOf } from '@agoric/marshal';
import { assert, details as d } from '@agoric/assert';
import { sameStructure, isGround, match } from '@agoric/same-structure';

import '../types';

const { entries } = Object;

// Operations for arrays with unique objects identifying and providing
// information about digital assets. Used for Zoe invites.
const identity = harden([]);

// Cut down the number of sameStructure comparisons to only the ones
// that don't fail basic equality tests
// TODO: better name?
const hashBadly = record => {
  const keys = Object.getOwnPropertyNames(record);
  keys.sort();
  const values = Object.values(record).filter(
    value => typeof value === 'string',
  );
  values.sort();
  return [...keys, ...values].join();
};

const makeBuckets = list => {
  const buckets = new Map();
  list.forEach(elem => {
    const badHash = hashBadly(elem);
    if (!buckets.has(badHash)) {
      buckets.set(badHash, []);
    }
    const soFar = buckets.get(badHash);
    soFar.push(elem);
  });
  return buckets;
};

// Based on bucket sort
const checkForDupes = buckets => {
  for (const maybeMatches of buckets.values()) {
    for (let i = 0; i < maybeMatches.length; i += 1) {
      for (let j = i + 1; j < maybeMatches.length; j += 1) {
        assert(
          !sameStructure(maybeMatches[i], maybeMatches[j]),
          d`value has duplicates: ${maybeMatches[i]} and ${maybeMatches[j]}`,
        );
      }
    }
  }
};

const hasElement = (buckets, elem) => {
  const badHash = hashBadly(elem);
  if (!buckets.has(badHash)) {
    return false;
  }
  const maybeMatches = buckets.get(badHash);
  return maybeMatches.some(maybeMatch => sameStructure(maybeMatch, elem));
};

// get a string of string keys and string values as a fuzzy hash for
// bucketing.
// only use sameStructure within that bucket.

/**
 * @type {MathHelpers}
 */
const setMathHelpers = harden({
  doCoerce: list => {
    assert(passStyleOf(list) === 'copyArray', 'list must be an array');
    checkForDupes(makeBuckets(list));
    return list;
  },
  doGetEmpty: _ => identity,
  doIsEmpty: list => passStyleOf(list) === 'copyArray' && list.length === 0,
  doIsGTE: (left, right) => {
    const leftBuckets = makeBuckets(left);
    return right.every(rightElem => hasElement(leftBuckets, rightElem));
  },
  doIsEqual: (left, right) => {
    return left.length === right.length && setMathHelpers.doIsGTE(left, right);
  },
  doAdd: (left, right) => {
    const combined = harden([...left, ...right]);
    checkForDupes(makeBuckets(combined));
    return combined;
  },
  doSubtract: (left, right) => {
    const leftBuckets = makeBuckets(left);
    const rightBuckets = makeBuckets(right);
    right.forEach(rightElem => {
      assert(
        hasElement(leftBuckets, rightElem),
        d`right element ${rightElem} was not in left`,
      );
    });
    const leftElemNotInRight = leftElem => !hasElement(rightBuckets, leftElem);
    return harden(left.filter(leftElemNotInRight));
  },

  // Do a case split among easy cases, and error on the rest for now.
  // TODO Actually implement this correctly.
  doFrugalSplit: (pattern, specimen) => {
    if (isGround(pattern)) {
      if (setMathHelpers.doIsGTE(specimen, pattern)) {
        return harden({
          matched: pattern,
          change: setMathHelpers.doSubtract(specimen, pattern),
        });
      }
      return undefined;
    }
    // Check for the special case where the pattern is a singleton array
    if (Array.isArray(pattern) && pattern.length === 1) {
      const subPattern = pattern[0];
      for (const [i, elem] of entries(specimen)) {
        if (match(subPattern, elem)) {
          // This just takes the first match, which is rather arbitrary.
          // At the level of abstraction where these lists represent
          // unordered sets, this is choice is non-deterministic, which
          // is inevitable.
          return harden({
            matched: [elem],
            change: [...specimen.slice(0, i), ...specimen.slice(i + 1)],
          });
        }
      }
      return undefined;
    }
    throw assert.fail(d`Only singleton patterns supported for now`);
  },
});

harden(setMathHelpers);
export default setMathHelpers;
