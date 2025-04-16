import { Fail } from '@endo/errors';

/**
 * Assert function to ensure that something expected to be a capdata object
 * actually is.  A capdata object should have a .body property that's a string
 * and a .slots property that's an array of strings.
 *
 * @param {any} specimen  The object to be tested
 * @throws {Error} if, upon inspection, the parameter does not satisfy the above
 *   criteria.
 * @returns {asserts specimen is import('./types.js').SwingSetCapData}
 */
export function insistCapData(specimen) {
  typeof specimen.body === 'string' ||
    Fail`capdata has non-string .body ${specimen.body}`;
  Array.isArray(specimen.slots) ||
    Fail`capdata has non-Array slots ${specimen.slots}`;
  assert(
    specimen.slots.every(slot => typeof slot === 'string'),
    'All slots must be strings',
  );
}
