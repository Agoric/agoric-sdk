import { assert } from '@agoric/assert';

import { createHash } from 'crypto';

/**
 * @typedef { (initial?: string | Buffer) => {
 *             add: (more: string | Buffer) => void,
 *             finish: () => string,
 *            }
 *          } CreateSHA256
 */

/** @type { CreateSHA256 } */
function createSHA256(initial = undefined) {
  const hash = createHash('sha256');
  let done = false;
  function add(more) {
    assert(!done);
    hash.update(more);
  }
  function finish() {
    assert(!done);
    done = true;
    return hash.digest('hex');
  }
  function sample() {
    return hash.copy().digest('hex');
  }
  if (initial) {
    add(initial);
  }
  return harden({ add, finish, sample });
}
harden(createSHA256);
export { createSHA256 };
