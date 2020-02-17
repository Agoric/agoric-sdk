import harden from '@agoric/harden';
import { passStyleOf } from '@agoric/marshal';
import { assert } from '@agoric/assert';
import Nat from '@agoric/nat';

// Operations for arrays with unique Nat elements.
const identity = harden([]);

const natListMathHelpers = harden({
  doAssertKind: list => {
    assert(passStyleOf(list) === 'copyArray', 'list must be an array');
    list.forEach(Nat);
  },
  doGetIdentity: _ => identity,
  doIsIdentity: list => passStyleOf(list) === 'copyArray' && list.length === 0,
  doIsGTE: (left, right) => {
    const leftSet = new Set(left);
    const leftHas = elem => leftSet.has(elem);
    return right.every(leftHas);
  },
  doIsEqual: (left, right) => {
    left = [...left];
    right = [...right];
    left.sort();
    right.sort();
    return left.every((num, i) => num === right[i]);
  },
  doAdd: (left, right) => {
    const union = new Set(left);
    const add = elem => union.add(elem);
    right.forEach(add);
    return Array.from(union);
  },
  doSubtract: (left, right) => {
    const leftSet = new Set(left);
    const remove = elem => leftSet.delete(elem);
    right.forEach(remove);
    return Array.from(leftSet);
  },
});

harden(natListMathHelpers);
export default natListMathHelpers;
