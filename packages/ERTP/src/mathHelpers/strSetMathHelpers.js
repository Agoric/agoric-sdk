// @ts-check

import { passStyleOf } from '@agoric/marshal';
import { assert, details as d, q } from '@agoric/assert';
import { patternKindOf, matches } from '@agoric/same-structure';

const { entries } = Object;

const identity = harden([]);

const checkForDupes = list => {
  const set = new Set(list);
  assert(set.size === list.length, d`value has duplicates: ${list}`);
};

/**
 * If the pattern is an array of patterns, then we define frugal according
 * to a first-fit rule, where the order of elements in the pattern and the
 * specimen matter. The most frugal match happens when the pattern is ordered
 * from most specific to most general. However, this is advice to the caller,
 * not something we either enforce or normalize to. As a result, a frugalSplit
 * can fail even if each of the sub patterns could have been matched with
 * distinct elements.
 *
 * For each element of the specimen, from left to right, we see if
 * it matches a sub pattern of pattern, from left to right. If so,
 * that sub pattern is satisfied and removed from the sub patterns yet
 * to be satisfied. The element is moved into matched or change accordingly.
 *
 * This algorithm is generic across mathKind values that represent a set
 * as an array of elements, so that it can be reused by other mathKinds.
 *
 * @param {ValuePattern} pattern
 * @param {Value} specimen
 * @returns {ValueSplit | undefined}
 */
const doFrugalSplit = (pattern, specimen) => {
  const patternKind = patternKindOf(pattern);
  switch (patternKind) {
    case undefined: {
      if (!Array.isArray(pattern)) {
        return undefined;
      }
      const hungryPatterns = [...pattern];
      const matched = [];
      const change = [];
      for (const element of specimen) {
        let found = false;
        for (const [iStr, subPattern] of entries(hungryPatterns)) {
          if (matches(subPattern, element)) {
            matched.push(element);
            hungryPatterns.splice(+iStr, 1);
            found = true;
            break;
          }
        }
        if (!found) {
          change.push(element);
        }
      }
      if (hungryPatterns.length >= 1) {
        return undefined;
      }
      return harden({ matched, change });
    }
    default: {
      throw assert.fail(d`Unexpected patternKind ${q(patternKind)}`);
    }
  }
};

harden(doFrugalSplit);
export { doFrugalSplit };

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
      assert(!union.has(elem), d`left and right have same element ${elem}`);
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
      d`some of the elements in right (${right}) were not present in left (${left})`,
    );
    return harden(Array.from(leftSet));
  },
  doFrugalSplit,
});

harden(strSetMathHelpers);
export default strSetMathHelpers;
