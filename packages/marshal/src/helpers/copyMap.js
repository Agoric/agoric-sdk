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
export const CopyMapPlug = harden({
  styleName: 'copyMap',

  canBeValid: (candidate, check = x => x) =>
    checkTagRecord(candidate, 'copyMap', check),

  assertValid: (candidate, passStyleOfRecur) => {
    CopyMapPlug.canBeValid(candidate, assertChecker);
    const proto = getPrototypeOf(candidate);
    assert(
      proto === null || proto === objectPrototype,
      X`A copyMap must inherit directly from null or Object.prototype: ${candidate}`,
    );
    const {
      // @ts-ignore TypeStript cannot index by symbols
      [PASS_STYLE]: _passStyleDesc,
      toString: toStringDesc,
      keys: keysDesc,
      values: valuesDesc,
      ...restDescs
    } = getOwnPropertyDescriptors(proto);

    assert(
      ownKeys(restDescs).length === 0,
      X`Unexpected properties on copyMap ${ownKeys(restDescs)}`,
    );
    assert(
      // @ts-ignore TypeScript thinks toString is a function, not a desciptor
      typeof toStringDesc.value === 'function',
      X`toString must be a function`,
    );
    assert.equal(
      // Note that passStyle already ensures that the array only contains
      // passables.
      passStyleOfRecur(keysDesc.value),
      'copyArray',
      X`A copyArray must have an array of keys: ${candidate}`,
    );

    // TODO Must also assert that the keys array contains only comparables,
    // which, fortunately, is the same as asserting that the array is a
    // comparable. However, that check is currently in passStyleOf.js,
    // leading to a layering problem.

    assert.equal(
      // Note that passStyle already ensures that the array only contains
      // passables.
      passStyleOfRecur(valuesDesc.value),
      'copyArray',
      X`A copyArray must have an array of values: ${candidate}`,
    );
    assert.equal(
      keysDesc.value.length,
      valuesDesc.value.length,
      X`The keys and values arrays must be the same length: ${candidate}`,
    );
    CopyMapPlug.every(candidate, v => !!passStyleOfRecur(v));
  },

  every: (passable, fn) =>
    // Note that we explicitly call `fn` with only the arguments we want
    // to provide.
    passable.keysDesc.every((v, i) => fn(v, i)) &&
    passable.values.every((v, i) => fn(v, i)),
});
