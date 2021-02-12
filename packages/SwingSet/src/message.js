import { assert, details as X } from '@agoric/assert';
import { insistCapData } from './capdata';

/**
 * Assert function to ensure that something expected to be a message object
 * actually is.  A message object should have a .method property that's a
 * string, a .args property that's a capdata object, and optionally a .result
 * property that, if present, must be a string.
 *
 * @param {any} message  The object to be tested
 *
 * @throws {Error} if, upon inspection, the parameter does not satisfy the above
 *   criteria.
 *
 * @returns {void}
 */
export function insistMessage(message) {
  assert.typeof(
    message.method,
    'string',
    X`message has non-string .method ${message.method}`,
  );
  insistCapData(message.args);
  if (message.result) {
    assert.typeof(
      message.result,
      'string',
      X`message has non-string non-null .result ${message.result}`,
    );
  }
}
