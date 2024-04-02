// @jessie-check

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

/**
 * @import {MathHelpers} from '../types.js'
 * @import {CopySet} from '@endo/patterns'
 */

/** @type {CopySet} */
const empty = makeCopySet([]);

/** @type {MathHelpers<CopySet>} */
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
