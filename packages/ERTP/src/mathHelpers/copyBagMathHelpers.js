import {
  keyEQ,
  makeCopyBag,
  fit,
  M,
  getCopyBagEntries,
  bagIsSuperbag,
  bagUnion,
  bagDisjointSubtract,
} from '@agoric/store';
import '../types-ambient.js';

/** @type {CopyBagValue} */
const empty = makeCopyBag([]);

/**
 * @type {MathHelpers<CopyBagValue>}
 */
export const copyBagMathHelpers = harden({
  doCoerce: bag => {
    fit(bag, M.bag(), 'bag of amount');
    return bag;
  },
  doMakeEmpty: () => empty,
  doIsEmpty: bag => getCopyBagEntries(bag).length === 0,
  doIsGTE: bagIsSuperbag,
  doIsEqual: keyEQ,
  doAdd: bagUnion,
  doSubtract: bagDisjointSubtract,
});
