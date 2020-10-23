// @ts-check

import { passStyleOf } from '@agoric/marshal';
import { assert, details as d, q } from '@agoric/assert';
import { patternKindOf } from '@agoric/same-structure';

const identity = harden([]);

const checkForDupes = list => {
  const set = new Set(list);
  assert(set.size === list.length, d`value has duplicates: ${list}`);
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

  // TODO Reform awful code!
  // Expanded this in place this way only as part of an expedient
  // spike. It is indeed a horrible clump of code that must be broken up.
  doFrugalSplit: (pattern, specimen) => {
    const patternKind = patternKindOf(pattern);
    if (patternKind === undefined) {
      const changeSet = new Set(specimen);
      let starCount = 0;
      const remove = subPattern => {
        const subPatternKind = patternKindOf(subPattern);
        if (subPatternKind === undefined) {
          return changeSet.delete(subPattern);
        }
        switch (subPatternKind) {
          case '*': {
            starCount += 1;
            break;
          }
          default: {
            throw assert.fail(
              d`Unexpected subPatternKind ${q(subPatternKind)}`,
            );
          }
        }
        return true;
      };
      if (!pattern.every(remove)) {
        return undefined;
      }
      if (changeSet.size < starCount) {
        return undefined;
      }
      for (const choice of changeSet) {
        changeSet.delete(choice);
        starCount -= 1;
        if (starCount === 0) {
          break;
        }
      }
      const change = harden(Array.from(changeSet));
      return harden({
        matched: strSetMathHelpers.doSubtract(specimen, change),
        change,
      });
    }
    switch (patternKind) {
      case '*': {
        return harden({
          matched: identity,
          change: specimen,
        });
      }
      default: {
        throw assert.fail(d`Unexpected patternKind ${q(patternKind)}`);
      }
    }
  },
});

harden(strSetMathHelpers);
export default strSetMathHelpers;
