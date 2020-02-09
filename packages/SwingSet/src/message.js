import { assert, details } from '@agoric/assert';
import { insistCapData } from './capdata';

/**
 * Assert function to ensure that something expected to be a message object
 * actually is.  A message object should have a .method property that's a
 * string, a .args property that's a capdata object, and optionally a .result
 * property that, if present, must be a string.
 *
 * @param message  The object to be tested
 *
 * @throws Error if, upon inspection, the parameter does not satisfy the above
 *   criteria.
 *
 * @return nothing
 */
export function insistMessage(message) {
  assert.equal(
    message.method,
    `${message.method}`,
    details`message has non-string .method ${message.method}`,
  );
  insistCapData(message.args);
  if (message.result) {
    assert.equal(
      message.result,
      `${message.result}`,
      details`message has non-string non-null .result ${message.result}`,
    );
  }
}
