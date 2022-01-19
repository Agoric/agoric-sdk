// @ts-check

import { assertChecker, passStyleOf } from '@agoric/marshal';
import {
  assertKey,
  makeSetOps,
  sortByRank,
  keyEQ,
  makeFullOrderComparatorKit,
} from '@agoric/store';
import '../types.js';

// Operations for arrays with unique objects identifying and providing
// information about digital assets. Used for Zoe invites.
/** @type {SetValue} */
const empty = harden([]);

/**
 * TODO SECURITY BUG: https://github.com/Agoric/agoric-sdk/issues/4261
 * This creates observable mutable static state, in the
 * history-based ordering of remotables.
 */
const fullCompare = makeFullOrderComparatorKit(true).antiComparator;

const {
  checkNoDuplicates,
  isListSuperset,
  listDisjointUnion,
  listDisjointSubtract,
} = makeSetOps(fullCompare);

const assertNoDuplicates = list => checkNoDuplicates(list, assertChecker);

/**
 * @deprecated Replace array-based SetMath with CopySet-based CopySetMath
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
  doIsGTE: isListSuperset,
  doIsEqual: keyEQ,
  doAdd: listDisjointUnion,
  doSubtract: listDisjointSubtract,
});
