// @ts-check

import { passStyleOf } from '@agoric/marshal';
import { assertKey, keyEQ } from '@agoric/store';
import { assert, details as X } from '@agoric/assert';

import '../types.js';

// Operations for arrays with unique objects identifying and providing
// information about digital assets. Used for Zoe invites.
/** @type {SetValue} */
const empty = harden([]);

/**
 * @param {Object} record
 * @returns {string}
 */
const getKeyForRecord = record => {
  const keys = Object.getOwnPropertyNames(record);
  keys.sort();
  const values = Object.values(record).filter(
    value => typeof value === 'string',
  );
  values.sort();
  return [...keys, ...values].join();
};

/**
 * Cut down the number of keyEQ comparisons to only the ones
 * that don't fail basic equality tests
 * TODO: better name?
 *
 * @param {SetValueElem} thing
 * @returns {SetValueElem}
 */
const hashBadly = thing => {
  // TODO Revisit before merging
  const type = typeof thing;
  const allowableNonObjectValues = ['string', 'number', 'bigint', 'boolean'];
  if (allowableNonObjectValues.includes(type)) {
    return thing;
  }
  if (passStyleOf(thing) === 'remotable') {
    return thing;
  }
  if (passStyleOf(thing) === 'copyRecord') {
    return getKeyForRecord(thing);
  }
  assert.fail(
    X`typeof ${typeof thing} is not allowed in an amount of AssetKind.SET`,
  );
};

/**
 * @typedef {Map<SetValueElem, SetValueElem[]>} Buckets
 */

/**
 * @param {SetValueElem[]} list
 * @returns {Buckets}
 */
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

/**
 * Based on bucket sort
 *
 * @param {Buckets} buckets
 */
const assertNoDuplicates = buckets => {
  for (const maybeMatches of buckets.values()) {
    for (let i = 0; i < maybeMatches.length; i += 1) {
      for (let j = i + 1; j < maybeMatches.length; j += 1) {
        assert(
          !keyEQ(maybeMatches[i], maybeMatches[j]),
          X`value has duplicates: ${maybeMatches[i]} and ${maybeMatches[j]}`,
        );
      }
    }
  }
};

/**
 *
 * @param {Buckets} buckets
 * @param {SetValueElem} elem
 * @returns {boolean}
 */
const hasElement = (buckets, elem) => {
  const badHash = hashBadly(elem);
  if (!buckets.has(badHash)) {
    return false;
  }
  const maybeMatches = buckets.get(badHash);
  assert(maybeMatches);
  return maybeMatches.some(maybeMatch => keyEQ(maybeMatch, elem));
};

// get a string of string keys and string values as a fuzzy hash for
// bucketing.
// only use keyEQ within that bucket.

/**
 * @type {SetMathHelpers}
 */
const setMathHelpers = harden({
  doCoerce: list => {
    assert(
      passStyleOf(list) === 'copyArray',
      `The value of a non-fungible token must be an array but was ${list}`,
    );
    // Assert that list contains only
    //   * pass-by-copy primitives,
    //   * pass-by-copy containers,
    //   * remotables.
    assertKey(list);
    assertNoDuplicates(makeBuckets(list));
    return list;
  },
  doMakeEmpty: () => empty,
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
    assertNoDuplicates(makeBuckets(combined));
    return combined;
  },
  doSubtract: (left, right) => {
    const leftBuckets = makeBuckets(left);
    const rightBuckets = makeBuckets(right);
    right.forEach(rightElem => {
      assert(
        hasElement(leftBuckets, rightElem),
        X`right element ${rightElem} was not in left`,
      );
    });
    /**
     * @param {SetValueElem} leftElem
     * @returns {boolean}
     */
    const leftElemNotInRight = leftElem => !hasElement(rightBuckets, leftElem);
    return harden(left.filter(leftElemNotInRight));
  },
});

harden(setMathHelpers);
export default setMathHelpers;
