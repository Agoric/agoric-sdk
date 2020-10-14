// @ts-check

import { passStyleOf } from '@agoric/marshal';
import { assert, details } from '@agoric/assert';

const identity = harden([]);

const assertUniqueSorted = list => {
  const len = list.length;
  for (let i = 1; i < len; i += 1) {
    const leftStr = list[i - 1];
    const rightStr = list[i];
    assert(leftStr !== rightStr, details`value has duplicates: ${list}`);
    assert(leftStr < rightStr, details`value not sorted ${list}`);
  }
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
    assertUniqueSorted(list);
    return harden(list);
  },
  doGetEmpty: _ => identity,
  doIsEmpty: list => passStyleOf(list) === 'copyArray' && list.length === 0,
  doIsGTE: (left, right) => {
    let leftI = 0;
    let rightI = 0;
    const leftLen = left.length;
    const rightLen = right.length;
    while (leftI < leftLen && rightI < rightLen) {
      const leftStr = left[leftI];
      const rightStr = right[rightI];
      if (leftStr < rightStr) {
        // an element of left not in right. Fine
        leftI += 1;
      } else if (leftStr > rightStr) {
        // an element of right not in left.
        return false;
      } else {
        leftI += 1;
        rightI += 1;
      }
    }
    // Are there no elements of right remaining?
    return rightI >= rightLen;
  },
  doIsEqual: (left, right) => {
    if (left.length !== right.length) {
      return false;
    }
    return left.every((leftStr, i) => leftStr === right[i]);
  },
  doAdd: (left, right) => {
    const result = [];
    let leftI = 0;
    let rightI = 0;
    const leftLen = left.length;
    const rightLen = right.length;
    while (leftI < leftLen && rightI < rightLen) {
      const leftStr = left[leftI];
      const rightStr = right[rightI];
      assert(
        leftStr !== rightStr,
        details`left and right have same element ${leftStr}`,
      );
      if (leftStr < rightStr) {
        result.push(leftStr);
        leftI += 1;
      } else {
        result.push(rightStr);
        rightI += 1;
      }
    }
    if (leftI < leftLen) {
      result.push(left[leftI]);
    } else if (rightI < rightLen) {
      result.push(right[rightI]);
    }
    return harden(result);
  },
  doSubtract: (left, right) => {
    const result = [];
    let leftI = 0;
    let rightI = 0;
    const leftLen = left.length;
    const rightLen = right.length;
    while (leftI < leftLen && rightI < rightLen) {
      const leftStr = left[leftI];
      const rightStr = right[rightI];
      assert(
        leftStr <= rightStr,
        details`element of right not present in left ${rightStr}`,
      );
      if (leftStr < rightStr) {
        // an element of left not in right. Keep.
        result.push(leftStr);
        leftI += 1;
      } else {
        // element in both. Skip.
        leftI += 1;
        rightI += 1;
      }
    }
    assert(
      rightI >= rightLen,
      details`some of the elements in right (${right}) were not present in left (${left})`,
    );
    if (leftI < leftLen) {
      result.push(left[leftI]);
    }
    return harden(result);
  },
});

harden(strSetMathHelpers);
export default strSetMathHelpers;
