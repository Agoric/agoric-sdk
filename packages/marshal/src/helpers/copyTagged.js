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
const {
  getPrototypeOf,
  getOwnPropertyDescriptors,
  prototype: objectPrototype,
} = Object;

/**
 *
 * @type {PassStylePlug}
 */
export const CopyTaggedPlug = harden({
  styleName: 'copyTagged',

  canBeValid: (candidate, check = x => x) =>
    checkTagRecord(candidate, 'copyTagged', check),

  assertValid: (candidate, passStyleOfRecur) => {
    CopyTaggedPlug.canBeValid(candidate, assertChecker);
    const proto = getPrototypeOf(candidate);
    assert(
      proto === null || proto === objectPrototype,
      X`A copyTagged must inherit directly from null or Object.prototype: ${candidate}`,
    );
    const {
      // @ts-ignore TypeStript cannot index by symbols
      [PASS_STYLE]: _passStyleDesc,
      toString: toStringDesc,
      payload: payloadDesc,
    } = getOwnPropertyDescriptors(proto);
    assert(
      // @ts-ignore TypeScript thinks toString is a function, not a desciptor
      typeof toStringDesc.value === 'function',
      X`toString must be a function`,
    );
    // Asserts only that the payload is passable
    passStyleOfRecur(payloadDesc.value);

    CopyTaggedPlug.every(candidate, v => !!passStyleOfRecur(v));
  },

  every: (passable, fn) => fn(passable.payload, 'payload'),
});
