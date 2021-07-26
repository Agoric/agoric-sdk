// @ts-check

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import '../types.js';
import './internal-types.js';
/**
 * TODO Why do I need these?
 *
 * @typedef {import('./internal-types.js').PassStylePlug} PassStylePlug
 */
import '@agoric/assert/exported.js';
import { assertChecker, hasOwnPropertyOf } from './passStyleHelpers.js';

const { details: X, quote: q } = assert;
const { getPrototypeOf, getOwnPropertyDescriptors } = Object;
const { ownKeys } = Reflect;
const { isArray, prototype: arrayPrototype } = Array;

/**
 *
 * @type {PassStylePlug}
 */
export const CopyArrayPlug = harden({
  styleName: 'copyArray',

  canBeValid: (candidate, check = x => x) =>
    check(isArray(candidate), X`Array expected: ${candidate}`),

  assertValid: (candidate, passStyleOfRecur) => {
    CopyArrayPlug.canBeValid(candidate, assertChecker);
    assert(
      getPrototypeOf(candidate) === arrayPrototype,
      X`Malformed array: ${candidate}`,
      TypeError,
    );
    const len = candidate.length;
    const descs = getOwnPropertyDescriptors(candidate);
    for (let i = 0; i < len; i += 1) {
      const desc = descs[i];
      assert(desc, X`Arrays must not contain holes: ${q(i)}`, TypeError);
      assert(
        hasOwnPropertyOf(desc, 'value'),
        X`Arrays must not contain accessors: ${q(i)}`,
        TypeError,
      );
      assert(
        desc.enumerable,
        X`Array elements must be enumerable: ${q(i)}`,
        TypeError,
      );
    }
    assert(
      ownKeys(descs).length === len + 1,
      X`Arrays must not have non-indexes: ${candidate}`,
      TypeError,
    );
    // Recursively validate that each member is passable.
    CopyArrayPlug.every(candidate, v => !!passStyleOfRecur(v));
  },

  every: (passable, fn) =>
    // Note that we explicitly call `fn` with only the arguments we want
    // to provide.
    passable.every((v, i) => fn(v, i)),
});
