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
import {
  assertChecker,
  checkTagRecord,
  PASS_STYLE,
} from './passStyleHelpers.js';

const { details: X } = assert;
const { ownKeys } = Reflect;
const {
  getPrototypeOf,
  getOwnPropertyDescriptors,
  prototype: objectPrototype,
} = Object;

/**
 *
 * @type {PassStylePlug}
 */
export const CopySetPlug = harden({
  styleName: 'copySet',

  canBeValid: (candidate, check = x => x) =>
    checkTagRecord(candidate, 'copySet', check),

  assertValid: (candidate, passStyleOfRecur) => {
    CopySetPlug.canBeValid(candidate, assertChecker);
    const proto = getPrototypeOf(candidate);
    assert(
      proto === null || proto === objectPrototype,
      X`A copySet must inherit directly from null or Object.prototype: ${candidate}`,
    );
    const {
      // @ts-ignore TypeStript cannot index by symbols
      [PASS_STYLE]: _passStyleDesc,
      toString: toStringDesc,
      elements: elementsDesc,
      ...restDescs
    } = getOwnPropertyDescriptors(proto);

    assert(
      ownKeys(restDescs).length === 0,
      X`Unexpected properties on copySet ${ownKeys(restDescs)}`,
    );
    assert(
      // @ts-ignore TypeScript thinks toString is a function, not a desciptor
      typeof toStringDesc.value === 'function',
      X`toString must be a function`,
    );
    assert.equal(
      // Note that passStyle already ensures that the array only contains
      // passables.
      passStyleOfRecur(elementsDesc.value),
      'copyArray',
      X`A copyArray must have an array of elements`,
    );

    // TODO Must also assert that the elements array contains only comparables,
    // which, fortunately, is the same as asserting that the array is a
    // comparable. However, that check is currently in passStyleOf.js,
    // leading to a layering problem.

    CopySetPlug.every(candidate, v => !!passStyleOfRecur(v));
  },

  every: (passable, fn) =>
    // Note that we explicitly call `fn` with only the arguments we want
    // to provide.
    passable.elements.every((v, i) => fn(v, i)),
});
