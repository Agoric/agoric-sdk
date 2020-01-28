import { insist } from './insist';
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
  insist(
    message.method === `${message.method}`,
    `message has non-string .method ${message.method}`,
  );
  insistCapData(message.args);
  if (message.result) {
    insist(
      message.result === `${message.result}`,
      `message has non-string non-null .result ${message.result}`,
    );
  }
}
