// Copyright (C) 2019 Agoric, under Apache License 2.0
/* global globalThis */
// @ts-check

// This module assumes the existence of a non-standard `assert` host object.
// SES version 0.11.0 introduces this global object and entangles it
// with the `console` host object in scope when it initializes,
// allowing errors, particularly assertion errors, to hide their "details"
// from callers that might catch those errors, then reveal them to the
// underlying console.
// To the extent that this `console` is considered a resource,
// this module must be considered a resource module.

import './types';

const { freeze } = Object;

/** @type {Assert} */
const globalAssert = globalThis.assert;

if (globalAssert === undefined) {
  throw new Error(
    `Cannot initialize @agoric/assert, missing globalThis.assert`,
  );
}

const missing = [
  'fail',
  'equal',
  'typeof',
  'string',
  'note',
  'details',
  'quote',
].filter(name => globalAssert[name] === undefined);
if (missing.length > 0) {
  throw new Error(
    `Cannot initialize @agoric/assert, missing globalThis.assert methods ${missing.join(
      ', ',
    )}`,
  );
}

const { details, quote } = globalAssert;

export { globalAssert as assert, details, quote };

// DEPRECATED: Going forward we encourage the pattern over importing the
// abbreviation 'q' for quote.
//
// ```js
// import { quote as q, details as d } from '@agoric/assert';
// ```
export { quote as q };

/**
 * Prepend the correct indefinite article onto a noun, typically a typeof result
 * e.g., "an Object" vs. "a Number"
 *
 * @deprecated
 * @param {string} str The noun to prepend
 * @returns {string} The noun prepended with a/an
 */
function an(str) {
  str = `${str}`;
  if (str.length >= 1 && 'aeiouAEIOU'.includes(str[0])) {
    return `an ${str}`;
  }
  return `a ${str}`;
}
freeze(an);
export { an };
