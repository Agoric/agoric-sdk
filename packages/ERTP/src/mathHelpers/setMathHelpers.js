// @ts-check

import { passStyleOf } from '@agoric/marshal';
import {
  assertKey,
  elementsIsSuperset,
  elementsDisjointUnion,
  elementsDisjointSubtract,
  coerceToElements,
  elementsCompare,
} from '@agoric/store';
import '../types.js';

// Operations for arrays with unique objects identifying and providing
// information about digital assets. Used for Zoe invites.
/** @type {SetValue} */
const empty = harden([]);

/**
 * @deprecated Replace array-based SetMath with CopySet-based CopySetMath
 * @type {SetMathHelpers}
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
  doIsGTE: elementsIsSuperset,
  doIsEqual: (x, y) => elementsCompare(x, y) === 0,
  doAdd: elementsDisjointUnion,
  doSubtract: elementsDisjointSubtract,
});
