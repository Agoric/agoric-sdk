/* global harden */

import { makeZoe } from '../../../src/zoe';

export function buildRootObject(vatPowers) {
  const zoe = makeZoe({}, vatPowers);
  return harden({
    getZoe: () => zoe,
  });
}
