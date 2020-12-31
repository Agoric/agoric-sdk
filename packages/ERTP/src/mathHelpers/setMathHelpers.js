// @ts-check

import { passStyleOf } from '@agoric/marshal';
import { assert, details } from '@agoric/assert';
import { sameStructure } from '@agoric/same-structure';

import '../types';

// Operations for arrays with unique objects identifying and providing
// information about digital assets. Used for Zoe invites.
const identity = harden([]);

// Cut down the number of sameStructure comparisons to only the ones
// that don't fail basic equality tests
// TODO: better name?

// Export for testing
export const hashBadly = record => {
  assert.typeof(record, 'object');
  const keys = Object.getOwnPropertyNames(record);
  keys.sort();
  const values = Object.values(record).filter(
    value => typeof value === 'string',
  );
  values.sort();
  return [...keys, ...values].join();
};

// Export for testing
export const makeBuckets = (list, getBucketKey = hashBadly) => {
  const buckets = new Map();
  list.forEach(elem => {
    const bucketKey = getBucketKey(elem);
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, []);
    }
    const bucket = buckets.get(bucketKey);
    bucket.push(elem);
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
          details`value has duplicates: ${maybeMatches[i]} and ${maybeMatches[j]}`,
        );
      }
    }
  }
};

// Export for testing
export const removeDuplicates = buckets => {
  const deduplicatedArray = [];
  for (const maybeMatches of buckets.values()) {
    for (let i = 0; i < maybeMatches.length; i += 1) {
      let itemIsUnique = true;
      const item = maybeMatches[i];
      for (let j = i + 1; j < maybeMatches.length; j += 1) {
        if (sameStructure(item, maybeMatches[j])) {
          itemIsUnique = false;
          break;
        }
      }
      if (itemIsUnique) {
        deduplicatedArray.push(item);
      }
    }
  }
  return deduplicatedArray;
};

const hasElement = (buckets, elem) => {
  const badHash = hashBadly(elem);
  if (!buckets.has(badHash)) {
    return false;
  }
  const maybeMatches = buckets.get(badHash);
  return maybeMatches.some(maybeMatch => sameStructure(maybeMatch, elem));
};

// This method must err on the side of giving the same string for
// values for which sameStructure would return false. It must *never* give different
// strings for two values for which sameStructure would return true.
export const makeGetStr = () => {
  const valueToStr = new Map();
  const defaultStr = '0';
  let id = 1;
  const getStr = value => {
    if (typeof value === 'string') {
      return value;
    }
    if (passStyleOf(value) === 'presence') {
      if (valueToStr.has(value)) {
        return valueToStr.get(value);
      }
      const str = `${id}`;
      valueToStr.set(value, str);
      id += 1;
      return str;
    }
    return defaultStr;
  };
  return getStr;
};

const getStr = makeGetStr();

// Export for testing
export const makeGetBucketKeyBasedOnSearchRecord = searchRecord => {
  const searchKeys = Object.getOwnPropertyNames(searchRecord);
  searchKeys.sort();
  const getBucketKey = record => {
    const strings = searchKeys.map(searchKey => {
      const value = record[searchKey];
      const valueString = getStr(value);
      return [searchKey, valueString].join();
    });
    return strings.join();
  };
  return getBucketKey;
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
        details`right element ${rightElem} was not in left`,
      );
    });
    const leftElemNotInRight = leftElem => !hasElement(rightBuckets, leftElem);
    return harden(left.filter(leftElemNotInRight));
  },
  doFind: (left, searchParameters) => {
    let matchNotFound = false;
    let arrayOfArrays;
    try {
      arrayOfArrays = searchParameters.map(searchRecord => {
        const getBucketKey = makeGetBucketKeyBasedOnSearchRecord(searchRecord);
        const leftBuckets = makeBuckets(left, getBucketKey);
        const bucketKey = getBucketKey(searchRecord);
        const maybeMatches = leftBuckets.get(bucketKey);
        if (maybeMatches === undefined) {
          matchNotFound = true;
          throw Error('match was not found');
        }
        const matches = maybeMatches.filter(maybeMatch =>
          // for every key that exists in searchRecord, the value for
          // that key in maybeMatch must be sameStructure
          Object.entries(searchRecord).every(([key, value]) =>
            sameStructure(maybeMatch[key], value),
          ),
        );
        if (matches.length <= 0) {
          matchNotFound = true;
          throw Error('match was not found');
        }
        return matches;
      });
    } catch (err) {
      if (matchNotFound) {
        // At least one searchRecord had no match
        return identity;
      } else {
        throw err;
      }
    }
    const buckets = makeBuckets(arrayOfArrays.flat());
    const array = removeDuplicates(buckets);
    return harden(array);
  },
});

harden(setMathHelpers);
export default setMathHelpers;
