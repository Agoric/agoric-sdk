// @ts-check

import { assertChecker, passStyleOf } from '@agoric/marshal';
import {
  assertKey,
  makeSetOps,
  isRankSorted,
  sortByRank,
  compareKeys,
  keyEQ,
} from '@agoric/store';
import { assert, details as X } from '@agoric/assert';

import '../types.js';

// Operations for arrays with unique objects identifying and providing
// information about digital assets. Used for Zoe invites.
/** @type {SetValue} */
const empty = harden([]);

/**
 * TODO This creates observable mutable static state, in the
 * history-based ordering of remotables.
 */
const { fullCompare, isSuperset, disjointUnion, disjointSubtract } = makeSetOps(
  true,
);

/**
 * @param {Key[]} list
 * @param {Checker=} check
 * @returns {boolean}
 */
const checkNoDuplicates = (list, check = x => x) => {
  if (!isRankSorted(list, fullCompare)) {
    return check(false, X`Must be fully ordered: ${list}`);
  }
  const { length } = list;
  for (let i = 1; i < length; i += 1) {
    const k0 = list[i - 1];
    const k1 = list[i];
    if (fullCompare(k0, k1) === 0) {
      return check(false, X`value has duplicates: ${k0}`);
    }
    const keyComp = compareKeys(k0, k1);
    // As symptoms of internal confusion, these are not check failures
    // but simple assertion failures.
    // TODO: should these be kill-the-vat errors instead? Probably.
    assert(
      keyComp !== 0,
      X`Internal: key equivalence should not be possible here: ${list}`,
    );
    assert(
      !(keyComp < 0),
      X`Internal: key descending order should not be possible here: ${list}`,
    );
  }
  return true;
};

const assertNoDuplicates = list => checkNoDuplicates(list, assertChecker);

/**
 * @type {SetMathHelpers}
 */
export const setMathHelpers = harden({
  doCoerce: list => {
    assert(
      passStyleOf(list) === 'copyArray',
      `The value of a non-fungible token must be an array but was ${list}`,
    );
    // Assert that list contains only
    //   * pass-by-copy primitives,
    //   * pass-by-copy containers containing keys,
    //   * remotables.
    assertKey(list);
    list = sortByRank(list, fullCompare);
    // As a coercion, should we also deduplicate here? Might mask bugs
    // elsewhere though, so probably not.
    assertNoDuplicates(list);
    return list;
  },
  doMakeEmpty: () => empty,
  doIsEmpty: list => passStyleOf(list) === 'copyArray' && list.length === 0,
  doIsGTE: isSuperset,
  doIsEqual: keyEQ,
  doAdd: disjointUnion,
  doSubtract: disjointSubtract,
});
