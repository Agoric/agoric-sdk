/* global harden */

import { makeZoe } from '../../../src/zoe';

export function buildRootObject(_vatPowers) {
  const zoe = makeZoe();
  return harden({
    getZoe: () => zoe,
  });
}
