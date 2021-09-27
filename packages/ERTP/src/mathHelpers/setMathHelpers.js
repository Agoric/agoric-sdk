// @ts-check

import { compareRank, makeRankSorted, passStyleOf } from '@agoric/marshal';
import { makeCopySet, compareKeys, keyEQ, keyGTE } from '@agoric/store';

import '../types.js';

const { details: X } = assert;

// TODO Eventually stop using sorted lists as the representation and
// go directly to copySets. Move the relevant algorithms into
// src/src/.

// Operations for arrays with unique objects identifying and providing
// information about digital assets. Used for Zoe invites.
/** @type {SetValue} */
const empty = harden([]);

const assertNoDuplicateKeys = _list => {
  // TODO Move to store/src/checkKeys.js
  // Have it check that the rank-sorted list has no duplicate keys.
  // Also needed for copySets and copyMaps.
};

/**
 * @type {SetMathHelpers}
 */
const setMathHelpers = harden({
  doCoerce: list => {
    list = makeRankSorted(list);
    assertNoDuplicateKeys(list);
    return list;
  },
  doMakeEmpty: () => empty,
  doIsEmpty: list => passStyleOf(list) === 'copyArray' && list.length === 0,
  doIsGTE: (left, right) => {
    const leftSet = makeCopySet(left);
    const rightSet = makeCopySet(right);
    return keyGTE(leftSet, rightSet);
  },
  doIsEqual: (left, right) => {
    const leftSet = makeCopySet(left);
    const rightSet = makeCopySet(right);
    return keyEQ(leftSet, rightSet);
  },
  doAdd: (left, right) => {
    // Rather than sorting from scratch, we can take advantage of the
    // inputs being sorted already and merge them in linear time.
    return setMathHelpers.doCoerce([...left, ...right]);
  },
  doSubtract: (left, right) => {
    // TODO As with the algorithm in compareKeys, we start with the
    // assumption that we do not have multiple distinct keys that are tied
    // for the same rank in either list. This is obviously wrong, such as with
    // multiple remotables.
    const result = [];
    let leftIndex = 0;
    let rightIndex = 0;
    while (leftIndex < left.length && rightIndex < right.length) {
      const leftEl = left[leftIndex];
      const rightEl = right[rightIndex];
      const rankComp = compareRank(leftEl, rightEl);
      const keyComp = compareKeys(leftEl, rightEl);
      if (rankComp === 0) {
        if (keyComp === 0) {
          // skip past a match
          leftIndex += 1;
          rightIndex += 1;
        } else {
          assert.fail(
            X`Distict keys tied for rank not yet implemented: ${leftEl}, ${rightEl}`,
          );
        }
      } else if (rankComp < 0) {
        assert(keyComp !== 0);
        // leftEl not matched. Take it
        result.push(leftEl);
        leftIndex += 1;
      } else {
        assert(keyComp !== 0);
        assert(rankComp > 0, X`right element ${rightEl} was not in left`);
      }
    }
    assert(
      rightIndex === right.length,
      X`right element ${right[rightIndex]} was not in left`,
    );
    while (leftIndex < left.length) {
      result.push(left[leftIndex]);
    }
    return harden(result);
  },
});

harden(setMathHelpers);
export default setMathHelpers;
