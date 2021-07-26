// @ts-check

import Nat from '@agoric/nat';
import { passStyleOf } from '@agoric/marshal';
import { assert, details } from '@agoric/assert';

const identity = harden({ strings: [], counts: [] });

const assertUniqueSorted = strings => {
  const len = strings.length;
  for (let i = 1; i < len; i += 1) {
    const leftStr = strings[i - 1];
    const rightStr = strings[i];
    assert(leftStr !== rightStr, details`value has duplicates: ${strings}`);
    assert(leftStr < rightStr, details`value not sorted ${strings}`);
  }
};

/**
 * Operations for arrays with unique string elements. More information
 * about these assets might be provided by some other mechanism, such as
 * an off-chain API or physical records. strBagMathHelpers are highly
 * efficient, but if the users rely on an external resource to learn
 * more about the digital assets (for example, looking up a string ID
 * in a database), the administrator of the external resource could
 * potentially change the external definition at any time.
 *
 * @type {MathHelpers}
 */
const strBagMathHelpers = harden({
  doCoerce: bag => {
    const { strings, counts } = bag;
    assert(passStyleOf(strings) === 'copyArray', 'value must be an array');
    assert(passStyleOf(counts) === 'copyArray', 'value must be an array');
    assert.equal(strings.length, counts.length);
    strings.forEach(str => assert.typeof(str, 'string'));
    counts.forEach(count => Nat(count) && assert(count >= 1));
    assertUniqueSorted(strings);
    return harden(bag);
  },
  doGetEmpty: _ => identity,
  doIsEmpty: ({ strings }) =>
    passStyleOf(strings) === 'copyArray' && strings.length === 0,
  doIsGTE: (leftBag, rightBag) => {
    const { strings: leftStrings, counts: leftCounts } = leftBag;
    const { strings: rightStrings, counts: rightCounts } = rightBag;
    let leftI = 0;
    let rightI = 0;
    const leftLen = leftStrings.length;
    const rightLen = rightStrings.length;
    while (leftI < leftLen && rightI < rightLen) {
      const leftStr = leftStrings[leftI];
      const rightStr = rightStrings[rightI];
      if (leftStr < rightStr) {
        // elements of left not in right. Fine
        leftI += 1;
      } else if (leftStr > rightStr) {
        // elements of right not in left.
        return false;
      } else if (leftCounts[leftI] < rightCounts[rightI]) {
        // more of this element on right than in left.
        return false;
      } else {
        leftI += 1;
        rightI += 1;
      }
    }
    // Are there no elements of right remaining?
    return rightI >= rightLen;
  },
  doIsEqual: (leftBag, rightBag) => {
    const { strings: leftStrings, counts: leftCounts } = leftBag;
    const { strings: rightStrings, counts: rightCounts } = rightBag;
    if (leftStrings.length !== rightStrings.length) {
      return false;
    }
    return leftStrings.every(
      (leftStr, i) =>
        leftStr === rightStrings[i] && leftCounts[i] === rightCounts[i],
    );
  },
  doAdd: (leftBag, rightBag) => {
    const { strings: leftStrings, counts: leftCounts } = leftBag;
    const { strings: rightStrings, counts: rightCounts } = rightBag;
    const resultStrings = [];
    const resultCounts = [];
    let leftI = 0;
    let rightI = 0;
    const leftLen = leftStrings.length;
    const rightLen = rightStrings.length;
    while (leftI < leftLen && rightI < rightLen) {
      const leftStr = leftStrings[leftI];
      const rightStr = rightStrings[rightI];
      if (leftStr < rightStr) {
        resultStrings.push(leftStr);
        resultCounts.push(leftCounts[leftI]);
        leftI += 1;
      } else if (leftStr > rightStr) {
        resultStrings.push(rightStr);
        resultCounts.push(rightCounts[rightI]);
        rightI += 1;
      } else {
        resultStrings.push(leftStr);
        resultCounts.push(Nat(leftCounts[leftI] + rightCounts[rightI]));
        leftI += 1;
        rightI += 1;
      }
    }
    if (leftI < leftLen) {
      resultStrings.push(leftStrings[leftI]);
      resultCounts.push(leftCounts[leftI]);
    } else if (rightI < rightLen) {
      resultStrings.push(rightStrings[rightI]);
      resultCounts.push(rightCounts[rightI]);
    }
    return harden({ strings: resultStrings, counts: resultCounts });
  },
  doSubtract: (leftBag, rightBag) => {
    const { strings: leftStrings, counts: leftCounts } = leftBag;
    const { strings: rightStrings, counts: rightCounts } = rightBag;
    const resultStrings = [];
    const resultCounts = [];
    let leftI = 0;
    let rightI = 0;
    const leftLen = leftStrings.length;
    const rightLen = rightStrings.length;
    while (leftI < leftLen && rightI < rightLen) {
      const leftStr = leftStrings[leftI];
      const rightStr = rightStrings[rightI];
      assert(
        leftStr <= rightStr,
        details`element of right not present in left ${rightStr}`,
      );
      if (leftStr < rightStr) {
        // an element of left not in right. Keep.
        resultStrings.push(leftStr);
        resultCounts.push(leftCounts[leftI]);
        leftI += 1;
      } else {
        // element in both.
        const leftCount = leftCounts[leftI];
        const rightCount = rightCounts[rightI];
        assert(
          leftCount >= rightCount,
          details`more of element on right than left ${rightStr},${rightCount}`,
        );
        const resultCount = Nat(leftCount - rightCount);
        if (resultCount >= 1) {
          resultStrings.push(leftStr);
          resultCounts.push(resultCount);
        }
        leftI += 1;
        rightI += 1;
      }
    }
    assert(
      rightI >= rightLen,
      details`some of the elements in right (${rightStrings}) were not present in left (${leftStrings})`,
    );
    if (leftI < leftLen) {
      resultStrings.push(leftStrings[leftI]);
      resultCounts.push(leftCounts[leftI]);
    }
    return harden({ strings: resultStrings, counts: resultCounts });
  },
});

harden(strBagMathHelpers);
export default strBagMathHelpers;
