import {
  keyEQ,
  makeCopySet,
  mustMatch,
  M,
  getCopySetKeys,
  setIsSuperset,
  setDisjointUnion,
  setDisjointSubtract,
} from '@agoric/store';
import '../types-ambient.js';

/** @type {CopySetValue} */
const empty = makeCopySet([]);

/**
 * @type {CopySetMathHelpers}
 */
export const copySetMathHelpers = harden({
  doCoerce: set => {
    mustMatch(set, M.set(), 'set of amount');
    return set;
  },
  doMakeEmpty: () => empty,
  doIsEmpty: set => getCopySetKeys(set).length === 0,
  doIsGTE: setIsSuperset,
  doIsEqual: keyEQ,
  doAdd: setDisjointUnion,
  doSubtract: setDisjointSubtract,
});
