// @jessie-check

import { Fail } from '@endo/errors';
import { passStyleOf, assertChecker } from '@endo/pass-style';
import { isKey, assertKey, elementsHasSplit, kindOf } from '@endo/patterns';
import {
  elementsIsSuperset,
  elementsDisjointUnion,
  elementsDisjointSubtract,
  coerceToElements,
  elementsCompare,
} from '@agoric/store';

/**
 * @import {Key} from '@endo/patterns'
 * @import {MathHelpers, SetValue} from '../types.js'
 */

// Operations for arrays with unique objects identifying and providing
// information about digital assets. Used for Zoe invites.
/** @type {SetValue} */
const empty = harden([]);

/**
 * @deprecated Replace array-based SetMath with CopySet-based CopySetMath
 * @type {MathHelpers<'set', Key, SetValue<Key>>}
 */
export const setMathHelpers = harden({
  doCoerce: list => {
    list = coerceToElements(list);
    // Assert that list contains only
    //   * pass-by-copy primitives,
    //   * pass-by-copy containers containing keys,
    //   * remotables.
    assertKey(list);
    return list;
  },
  doMakeEmpty: () => empty,
  doIsEmpty: list => passStyleOf(list) === 'copyArray' && list.length === 0,
  doIsGTE: (left, rightBound) => {
    if (isKey(rightBound)) {
      return elementsIsSuperset(left, rightBound);
    }
    kindOf(rightBound) === 'match:has' ||
      Fail`rightBound must either be a key or an M.has pattern ${rightBound}`;
    const {
      payload: [elementPatt, bound],
    } = rightBound;
    return elementsHasSplit(left, elementPatt, bound);
  },
  doIsEqual: (x, y) => elementsCompare(x, y) === 0,
  doAdd: elementsDisjointUnion,
  doSubtract: (left, rightBound) => {
    if (isKey(rightBound)) {
      return elementsDisjointSubtract(left, rightBound);
    }
    kindOf(rightBound) === 'match:has' ||
      Fail`rightBound must either be a key or an M.has pattern ${rightBound}`;
    const {
      payload: [elementPatt, bound],
    } = rightBound;
    const result = [];
    elementsHasSplit(
      left,
      elementPatt,
      bound,
      undefined,
      result,
      assertChecker,
    );
    return harden(result);
  },
});
