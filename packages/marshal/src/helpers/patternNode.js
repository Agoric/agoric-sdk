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
export const PatternNodePlug = harden({
  styleName: 'patternNode',

  canBeValid: (candidate, check = x => x) =>
    checkTagRecord(candidate, 'patternNode', check),

  assertValid: (candidate, passStyleOfRecur) => {
    PatternNodePlug.canBeValid(candidate, assertChecker);
    const proto = getPrototypeOf(candidate);
    assert(
      proto === null || proto === objectPrototype,
      X`A patternNode must inherit directly from null or Object.prototype: ${candidate}`,
    );
    const {
      // @ts-ignore TypeStript cannot index by symbols
      [PASS_STYLE]: _passStyleDesc,
      toString: toStringDesc,
      patternKind: patternKindDesc,
      ..._restDescs
    } = getOwnPropertyDescriptors(proto);

    assert(
      // @ts-ignore TypeScript thinks toString is a function, not a desciptor
      typeof toStringDesc.value === 'function',
      X`toString must be a function`,
    );
    assert(
      typeof patternKindDesc.value === 'string',
      X`toString must be a function`,
    );
    // TODO The test of patternNode validation.
    PatternNodePlug.every(candidate, v => !!passStyleOfRecur(v));
  },

  every: (_passable, _fn) =>
    // Enumerate, for each pattern
    true,
});
