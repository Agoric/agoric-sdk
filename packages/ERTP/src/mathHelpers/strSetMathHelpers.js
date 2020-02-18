import harden from '@agoric/harden';
import { passStyleOf } from '@agoric/marshal';
import { assert, details, openDetail } from '@agoric/assert';

// Operations for arrays with unique string elements. More information
// about these assets might be provided by some other mechanism, such as
// an off-chain API or physical records. strSetMathHelpers are highly
// efficient, but if the users rely on an external resource to learn
// more about the digital assets (for example, looking up a string ID
// in a database), the administrator of the external resource could
// potentially change the external definition at any time.

const identity = harden([]);

const checkForDupes = (list, listName = 'list') => {
  const set = new Set(list);
  assert(
    set.size === list.length,
    details`${openDetail(listName)} has duplicates`,
  );
  return set;
};

const strSetMathHelpers = harden({
  doAssertKind: list => {
    assert(passStyleOf(list) === 'copyArray', 'list must be an array');
    list.forEach(elem => assert.typeof(elem, 'string'));
  },
  doGetIdentity: _ => identity,
  doIsIdentity: list => passStyleOf(list) === 'copyArray' && list.length === 0,
  doIsGTE: (left, right) => {
    const leftSet = checkForDupes(left, 'doIsGTE left');
    checkForDupes(right, 'doIsGTE right');
    const leftHas = elem => leftSet.has(elem);
    return right.every(leftHas);
  },
  doIsEqual: (left, right) => {
    const leftSet = checkForDupes(left, 'doIsEqual left');
    checkForDupes(right, 'doIsEqual right');
    const leftHas = elem => leftSet.has(elem);
    return left.length === right.length && right.every(leftHas);
  },
  doAdd: (left, right) => {
    checkForDupes(left, 'doAdd left');
    checkForDupes(right, 'doAdd right');
    const union = new Set(left);
    const addToUnion = elem => {
      assert(
        !union.has(elem),
        details`doAdd left and right have same element ${elem}`,
      );
      union.add(elem);
    };
    right.forEach(addToUnion);
    return Array.from(union);
  },
  doSubtract: (left, right) => {
    const leftSet = checkForDupes(left, 'doSubtract left');
    checkForDupes(right, 'doSubtract right');
    const remove = elem => leftSet.delete(elem);
    const allRemovedCorrectly = right.every(remove);
    assert(
      allRemovedCorrectly,
      details`some of the elements in right (${right}) were not present in left (${left})`,
    );
    return Array.from(leftSet);
  },
});

harden(strSetMathHelpers);
export default strSetMathHelpers;
