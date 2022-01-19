// @ts-check

import {
  makeSetOps,
  keyEQ,
  makeCopySet,
  fit,
  M,
  getCopySetKeys,
  makeFullOrderComparatorKit,
} from '@agoric/store';
import '../types.js';

/** @type {CopySetValue} */
const empty = makeCopySet([]);

/**
 * TODO SECURITY BUG: https://github.com/Agoric/agoric-sdk/issues/4261
 * This creates observable mutable static state, in the
 * history-based ordering of remotables.
 */
const fullCompare = makeFullOrderComparatorKit(true).antiComparator;

const { isSetSuperset, setDisjointUnion, setDisjointSubtract } = makeSetOps(
  fullCompare,
);

/**
 * @type {CopySetMathHelpers}
 */
export const copySetMathHelpers = harden({
  doCoerce: set => {
    fit(set, M.set());
    return set;
  },
  doMakeEmpty: () => empty,
  doIsEmpty: set => getCopySetKeys(set).length === 0,
  doIsGTE: isSetSuperset,
  doIsEqual: keyEQ,
  doAdd: setDisjointUnion,
  doSubtract: setDisjointSubtract,
});
