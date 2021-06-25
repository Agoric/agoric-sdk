/* global globalThis */
// Copyright (C) 2019 Agoric, under Apache License 2.0
// @ts-check

// This module assumes the existence of a non-standard `assert` host object.
// SES version 0.11.0 introduces this global object and entangles it
// with the `console` host object in scope when it initializes,
// allowing errors, particularly assertion errors, to hide their "details"
// from callers that might catch those errors, then reveal them to the
// underlying console.
// To the extent that this `console` is considered a resource,
// this module must be considered a resource module.

// The assertions re-exported here are defined in
// https://github.com/endojs/endo/blob/master/packages/ses/src/error/assert.js

// At https://github.com/Agoric/agoric-sdk/issues/2774
// is a record of a failed attempt to remove '.types'.
// To satisfy CI, not only do we need to keep the file,
// but we need to import it here as well.
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
  'makeAssert',
].filter(name => globalAssert[name] === undefined);
if (missing.length > 0) {
  throw new Error(
    `Cannot initialize @agoric/assert, missing globalThis.assert methods ${missing.join(
      ', ',
    )}`,
  );
}

const { details, quote, makeAssert } = globalAssert;

export { globalAssert as assert, details, quote };

export { quote as q };

export { makeAssert };

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

// eslint-disable-next-line jsdoc/require-returns-check
/**
 * This `fatalRaise` helper function is needed only until we can depend on
 * https://github.com/endojs/endo/pull/796 . In anticipation, it feature tests
 * for `fatalAssert.raise`. If absent it fails back to a more awkward use of
 * `fatalAssert.fail`.
 *
 * @deprecated
 * @param {Assert} fatalAssert
 * @param {Error} reason
 * @returns {never}
 */
const fatalRaise = (fatalAssert, reason) => {
  // In order to feature test for a future feature, we must temporarily
  // ignore that feature's absence from current types.
  // @ts-ignore
  if (typeof fatalAssert.raise === 'function') {
    // Once we can depend on https://github.com/endojs/endo/pull/796 we
    // should replace all calls to this function with the following line.
    // The `throw` below is because we don't yet statically know that
    // `fatalAssert.raise` never returns.
    // @ts-ignore
    throw fatalAssert.raise(reason);
  } else {
    fatalAssert.fail(details`Terminating due to ${reason}`);
  }
};
freeze(fatalRaise);
export { fatalRaise };
