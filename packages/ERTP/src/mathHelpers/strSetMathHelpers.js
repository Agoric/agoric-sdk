// @ts-check

import { passStyleOf } from '@agoric/marshal';
import { assert, details as X } from '@agoric/assert';

const identity = harden([]);

const checkForDupes = list => {
  const set = new Set(list);
  assert(set.size === list.length, X`value has duplicates: ${list}`);
};

/**
 * Operations for arrays with unique string elements. More information
 * about these assets might be provided by some other mechanism, such as
 * an off-chain API or physical records. strSetMathHelpers are highly
 * efficient, but if the users rely on an external resource to learn
 * more about the digital assets (for example, looking up a string ID
 * in a database), the administrator of the external resource could
 * potentially change the external definition at any time.
 *
 * @type {MathHelpers}
 */
const strSetMathHelpers = harden({
  doCoerce: list => {
    assert(passStyleOf(list) === 'copyArray', 'value must be an array');
    list.forEach(elem => assert.typeof(elem, 'string'));
    checkForDupes(list);
    return list;
  },
  doGetEmpty: _ => identity,
  doIsEmpty: list => passStyleOf(list) === 'copyArray' && list.length === 0,
  doIsGTE: (left, right) => {
    const leftSet = new Set(left);
    const leftHas = elem => leftSet.has(elem);
    return right.every(leftHas);
  },
  doIsEqual: (left, right) => {
    const leftSet = new Set(left);
    const leftHas = elem => leftSet.has(elem);
    return left.length === right.length && right.every(leftHas);
  },
  doAdd: (left, right) => {
    const union = new Set(left);
    const addToUnion = elem => {
      assert(!union.has(elem), X`left and right have same element ${elem}`);
      union.add(elem);
    };
    right.forEach(addToUnion);
    return harden(Array.from(union));
  },
  doSubtract: (left, right) => {
    const leftSet = new Set(left);
    const remove = elem => leftSet.delete(elem);
    const allRemovedCorrectly = right.every(remove);
    assert(
      allRemovedCorrectly,
      X`some of the elements in right (${right}) were not present in left (${left})`,
    );
    return harden(Array.from(leftSet));
  },
});

harden(strSetMathHelpers);
export default strSetMathHelpers;
