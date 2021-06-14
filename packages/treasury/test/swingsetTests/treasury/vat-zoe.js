// @ts-check

import { Far } from '@agoric/marshal';

import { makeZoe } from '@agoric/zoe';

export function buildRootObject(_vatPowers) {
  return Far('root', {
    buildZoe: vatAdminSvc => makeZoe(vatAdminSvc),
  });
}
