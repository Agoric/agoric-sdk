import harden from '@agoric/harden';
import { passStyleOf } from '@agoric/marshal';
import { assert } from '@agoric/assert';

// Note: Equality between elements is defined as getIdentifierFn(x)
// === getIdentifierFn(y), even if x and y otherwise have different
// properties (they shouldn't, but we do not check for that here.)
// Furthermore, this code assumes getIdentifierFn(x) ===
// getIdentifierFn(y) iff sameStructure(x, y) is true.

const makeObjListMathHelpers = (customInsistFn, getIdentifierFn) => {
  const identity = harden([]);
  const helpers = harden({
    doAssertKind: list => {
      assert(passStyleOf(list) === 'copyArray', 'list must be an array');
      list.forEach(customInsistFn);
    },
    doGetIdentity: _ => identity,
    doIsIdentity: list =>
      passStyleOf(list) === 'copyArray' && list.length === 0,
    doIsGTE: (left, right) => {
      const leftIds = left.map(getIdentifierFn);
      const rightIds = right.map(getIdentifierFn);
      const leftWeakSet = new WeakSet(leftIds);
      const leftHas = elem => leftWeakSet.has(elem);
      return rightIds.every(leftHas);
    },
    doIsEqual: (left, right) =>
      left.length === right.length && helpers.doIsGTE(right, left),
    doAdd: (left, right) => {
      const unionWeakSet = new WeakSet();
      const result = [];
      left.forEach(extent => {
        if (!unionWeakSet.has(getIdentifierFn(extent))) {
          unionWeakSet.add(getIdentifierFn(extent));
          result.push(extent);
        }
      });
      right.forEach(extent => {
        if (!unionWeakSet.has(getIdentifierFn(extent))) {
          unionWeakSet.add(getIdentifierFn(extent));
          result.push(extent);
        }
      });
      return harden(result);
    },
    doSubtract: (left, right) => {
      const uniqueLeft = [];
      const leftWeakSet = new WeakSet();
      left.forEach(extent => {
        if (!leftWeakSet.has(getIdentifierFn(extent))) {
          leftWeakSet.add(getIdentifierFn(extent));
          uniqueLeft.push(extent);
        }
      });
      const rightIds = right.map(getIdentifierFn);
      const rightWeakSet = new WeakSet(rightIds);
      right.forEach(extent => {
        if (!leftWeakSet.has(getIdentifierFn(extent))) {
          throw new Error('right element was not in left');
        }
      });
      return harden(
        uniqueLeft.filter(extent => !rightWeakSet.has(getIdentifierFn(extent))),
      );
    },
  });
  return helpers;
};
harden(makeObjListMathHelpers);

export { makeObjListMathHelpers };
