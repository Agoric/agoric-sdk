import { Fail } from '@endo/errors';

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
    !done || Fail`hash already finished`;
    hash.update(more);
    return self;
  }
  function finish() {
    !done || Fail`hash already finished`;
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
