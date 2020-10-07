// @ts-check
import { assert, details } from '@agoric/assert';
import { insistCapData } from './capdata';

/**
 * @param {unknown} message
 * @returns { Message }
 */
export function asMessage(message) {
  assert(message !== undefined);
  assert.typeof(message, 'object');

  const { method, args, result } = message;
  assert.typeof(
    method,
    'string',
    details`message has non-string .method ${method}`,
  );
  insistCapData(args);
  if (result) {
    assert.typeof(
      result,
      'string',
      details`message has non-string non-null .result ${result}`,
    );
  }
  return message;
}

/**
 * Assert function to ensure that something expected to be a message object
 * actually is.  A message object should have a .method property that's a
 * string, a .args property that's a capdata object, and optionally a .result
 * property that, if present, must be a string.
 *
 * @param {unknown} message  The object to be tested
 *
 * @throws {Error} if, upon inspection, the parameter does not satisfy the above
 *   criteria.
 *
 * @returns {void}
 */
export function insistMessage(message) {
  asMessage(message);
}
