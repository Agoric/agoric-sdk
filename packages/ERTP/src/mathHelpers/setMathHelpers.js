import harden from '@agoric/harden';
import { passStyleOf } from '@agoric/marshal';
import { assert, details, openDetail } from '@agoric/assert';
import { sameStructure } from '@agoric/same-structure';

// Operations for arrays with unique objects identifying and providing
// information about digital assets. Used for Zoe invites.
const identity = harden([]);

// Cut down the number of sameStructure comparisons to only the ones
// that don't fail basic equality tests
const nonUniqueHash = record => {
  const keys = Object.getOwnPropertyNames(record);
  keys.sort();
  const values = Object.values(record);
  values.filter(value => typeof value === 'string');
  values.sort();
  const hash = [...keys, ...values].join();
  return hash;
};

// Based on bucket sort
const checkForDupes = (list, listName) => {
  const buckets = new Map();
  list.forEach(elem => {
    const hash = nonUniqueHash(elem);
    if (!buckets.has(hash)) {
      buckets.set(hash, []);
    }
    const soFar = buckets.get(hash);
    soFar.push(elem);
  });
  for (const maybeMatches of buckets.values()) {
    for (let i = 0; i < maybeMatches.length; i += 1) {
      for (let j = i + 1; j < maybeMatches.length; j += 1) {
        assert(
          !sameStructure(maybeMatches[i], maybeMatches[j]),
          details`${openDetail(listName)} duplicate found: ${
            maybeMatches[i]
          } and ${maybeMatches[j]}`,
        );
      }
    }
  }
};

// get a string of string keys and string values as a fuzzy hash for
// bucketing.
// only use sameStructure within that bucket.

const setMathHelpers = harden({
  doAssertKind: list => {
    assert(passStyleOf(list) === 'copyArray', 'list must be an array');
    const assertCopyRecord = elem => {
      const passStyle = passStyleOf(elem);
      assert(
        passStyle === 'copyRecord' || passStyle === 'presence',
        details`element ${elem} should be a record or a presence`,
      );
    };
    list.forEach(assertCopyRecord);
  },
  doGetIdentity: _ => identity,
  doIsIdentity: list => passStyleOf(list) === 'copyArray' && list.length === 0,
  doIsGTE: (left, right) => {
    checkForDupes(left, 'doIsGTE left');
    checkForDupes(right, 'doIsGTE right');
    const leftHasEqualForRightElem = rightElem =>
      left.some(leftElem => sameStructure(leftElem, rightElem));
    return right.every(leftHasEqualForRightElem);
  },
  doIsEqual: (left, right) => {
    checkForDupes(left, 'doIsEqual left');
    checkForDupes(right, 'doIsEqual right');
    return left.length === right.length && setMathHelpers.doIsGTE(left, right);
  },
  doAdd: (left, right) => {
    const combined = harden([...left, ...right]);
    checkForDupes(combined, 'doAdd left and right');
    return combined;
  },
  doSubtract: (left, right) => {
    checkForDupes(left, 'doSubtract left');
    checkForDupes(right, 'doSubtract right');
    const leftHasEqualForRightElem = rightElem =>
      left.some(leftElem => sameStructure(leftElem, rightElem));
    right.forEach(rightElem => {
      assert(
        leftHasEqualForRightElem(rightElem),
        details`right element ${rightElem} was not in left`,
      );
    });
    const leftElemNotInRight = leftElem =>
      !right.some(rightElem => sameStructure(leftElem, rightElem));
    return harden(left.filter(leftElemNotInRight));
  },
});

harden(setMathHelpers);
export default setMathHelpers;
