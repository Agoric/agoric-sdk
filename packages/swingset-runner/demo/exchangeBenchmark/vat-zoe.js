/* global harden */

import { makeZoe } from '@agoric/zoe';

export function buildRootObject(_vatPowers) {
  const zoe = makeZoe();
  return harden({
    getZoe: () => zoe,
  });
}
