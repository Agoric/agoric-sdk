import { assert, details } from '@agoric/assert';

/* eslint-disable jsdoc/valid-types,jsdoc/require-returns-check */
/**
 * Assert function to ensure that something expected to be a capdata object
 * actually is.  A capdata object should have a .body property that's a string
 * and a .slots property that's an array of strings.
 *
 * @param {any} capdata  The object to be tested
 * @throws {Error} if, upon inspection, the parameter does not satisfy the above
 *   criteria.
 * @returns {asserts capdata is CapData}
 */
export function insistCapData(capdata) {
  assert.typeof(
    capdata.body,
    'string',
    details`capdata has non-string .body ${capdata.body}`,
  );
  assert(
    Array.isArray(capdata.slots),
    details`capdata has non-Array slots ${capdata.slots}`,
  );
  // TODO check that the .slots array elements are actually strings
}
