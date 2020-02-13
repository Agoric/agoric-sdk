import harden from '@agoric/harden';
import { passStyleOf } from '@agoric/marshal';
import { assert } from '@agoric/assert';

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
      const has = elem => leftWeakSet.has(elem);
      return rightIds.every(has);
    },
    doIsEqual: (left, right) =>
      helpers.doIsGTE(left, right) && helpers.doIsGTE(right, left),
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
      return uniqueLeft.filter(
        extent => !rightWeakSet.has(getIdentifierFn(extent)),
      );
    },
  });
  return helpers;
};
harden(makeObjListMathHelpers);

export { makeObjListMathHelpers };
