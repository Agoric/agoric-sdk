import { Fail } from '@endo/errors';

/**
 * Assert function to ensure that something expected to be a capdata object
 * actually is.  A capdata object should have a .body property that's a string
 * and a .slots property that's an array of strings.
 *
 * @param {any} capdata  The object to be tested
 * @throws {Error} if, upon inspection, the parameter does not satisfy the above
 *   criteria.
 * @returns {asserts capdata is import('./types.js').SwingSetCapData}
 */
export function insistCapData(capdata) {
  typeof capdata.body === 'string' ||
    Fail`capdata has non-string .body ${capdata.body}`;
  Array.isArray(capdata.slots) ||
    Fail`capdata has non-Array slots ${capdata.slots}`;
  // TODO check that the .slots array elements are actually strings
}
