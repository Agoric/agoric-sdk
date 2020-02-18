import harden from '@agoric/harden';
import { passStyleOf } from '@agoric/marshal';
import { assert, details } from '@agoric/assert';
import { sameStructure } from '@agoric/same-structure';

// Operations for arrays with unique objects identifying and providing
// information about digital assets, including Zoe invites.
const identity = harden([]);

const setMathHelpers = harden({
  doAssertKind: list => {
    assert(passStyleOf(list) === 'copyArray', 'list must be an array');
    const assertCopyRecord = elem =>
      assert(
        passStyleOf(elem) === 'copyRecord',
        details`element ${elem} should be a record`,
      );
    list.forEach(assertCopyRecord);
  },
  doGetIdentity: _ => identity,
  doIsIdentity: list => passStyleOf(list) === 'copyArray' && list.length === 0,
  doIsGTE: (left, right) => {
    const leftHasEqualForRightElem = rightElem =>
      left.some(leftElem => sameStructure(leftElem, rightElem));
    return right.every(leftHasEqualForRightElem);
  },
  doIsEqual: (left, right) =>
    left.length === right.length && setMathHelpers.doIsGTE(left, right),
  doAdd: (left, right) => {
    const leftDoesntHaveEqualForRightElem = rightElem =>
      !left.some(leftElem => sameStructure(leftElem, rightElem));
    return harden([...left, ...right.map(leftDoesntHaveEqualForRightElem)]);
  },
  doSubtract: (left, right) => {
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
