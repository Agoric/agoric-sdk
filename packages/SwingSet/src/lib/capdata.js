const { details: X } = assert;

/* eslint-disable jsdoc/require-returns-check */
/**
 * Assert function to ensure that something expected to be a capdata object
 * actually is.  A capdata object should have a .body property that's a string
 * and a .slots property that's an array of strings.
 *
 * @param {any} capdata  The object to be tested
 * @throws {Error} if, upon inspection, the parameter does not satisfy the above
 *   criteria.
 * @returns {asserts capdata is import('@endo/marshal').CapData<unknown>}
 */
export function insistCapData(capdata) {
  assert.typeof(
    capdata.body,
    'string',
    X`capdata has non-string .body ${capdata.body}`,
  );
  assert(
    Array.isArray(capdata.slots),
    X`capdata has non-Array slots ${capdata.slots}`,
  );
  // TODO check that the .slots array elements are actually strings
}

/**
 * Returns the slot of a presence if the provided capdata is composed
 * of a single presence, `null` otherwise
 *
 * @param {import('@endo/marshal').CapData<unknown>} data
 * @returns {string | undefined}
 */
export function extractSingleSlot(data) {
  const body = JSON.parse(data.body);
  if (
    body &&
    typeof body === 'object' &&
    body['@qclass'] === 'slot' &&
    body.index === 0
  ) {
    if (data.slots.length === 1) {
      return data.slots[0];
    }
  }
  return null;
}
