// @jessie-check

import {
  keyEQ,
  makeCopyBag,
  mustMatch,
  M,
  getCopyBagEntries,
  bagIsSuperbag,
  bagUnion,
  bagDisjointSubtract,
} from '@agoric/store';

/** @import {MathHelpers} from '../types.js' */

/** @type {import('@endo/patterns').CopyBag} */
const empty = makeCopyBag([]);

/** @type {MathHelpers<import('@endo/patterns').CopyBag>} */
export const copyBagMathHelpers = harden({
  doCoerce: bag => {
    mustMatch(bag, M.bag(), 'bag of amount');
    return bag;
  },
  doMakeEmpty: () => empty,
  doIsEmpty: bag => getCopyBagEntries(bag).length === 0,
  doIsGTE: bagIsSuperbag,
  doIsEqual: keyEQ,
  doAdd: bagUnion,
  doSubtract: bagDisjointSubtract,
});
