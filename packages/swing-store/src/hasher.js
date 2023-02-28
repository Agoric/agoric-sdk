import { assert } from '@agoric/assert';

import { createHash } from 'crypto';

/**
 * @typedef {{
 *   add: (more: string | Buffer) => Hasher,
 *   finish: () => string,
 * }} Hasher
 */

/**
 * @param {string | Buffer} [initial]
 * @returns {Hasher}
 */
function createSHA256(initial = undefined) {
  const hash = createHash('sha256');
  let done = false;
  // eslint-disable-next-line no-use-before-define
  const self = harden({ add, finish, sample });
  function add(more) {
    assert(!done);
    hash.update(more);
    return self;
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
  return self;
}
harden(createSHA256);
export { createSHA256 };
