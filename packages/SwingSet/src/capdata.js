// @ts-check
import { assert, details } from '@agoric/assert';

/**
 * @param {unknown} capdata  The object to be tested
 * @throws {Error} if, upon inspection, the parameter does not satisfy the above
 *   criteria.
 * @returns {CapData}
 */
function asCapData(capdata) {
  assert(capdata !== undefined);
  assert.typeof(capdata, 'object');
  const { body, slots } = capdata;
  assert.typeof(body, 'string', details`capdata has non-string .body ${body}`);
  assert(Array.isArray(slots), details`capdata has non-Array slots ${slots}`);
  // TODO check that the .slots array elements are actually strings
  return capdata;
}

/**
 * Assert function to ensure that something expected to be a capdata object
 * actually is.  A capdata object should have a .body property that's a string
 * and a .slots property that's an array of strings.
 *
 * @param {unknown} capdata  The object to be tested
 * @throws {Error} if, upon inspection, the parameter does not satisfy the above
 *   criteria.
 * @returns {void}
 */
export function insistCapData(capdata) {
  asCapData(capdata);
}
