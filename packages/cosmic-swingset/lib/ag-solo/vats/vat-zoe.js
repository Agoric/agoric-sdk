/* global harden */

import { makeZoe } from '@agoric/zoe';

export function buildRootObject(_vatPowers) {
  return harden({
    buildZoe: adminVat => makeZoe(adminVat),
  });
}
