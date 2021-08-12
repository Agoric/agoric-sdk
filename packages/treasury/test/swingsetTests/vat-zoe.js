// @ts-check

import { Far } from '@agoric/marshal';

import { makeZoeKit } from '@agoric/zoe';

export function buildRootObject(_vatPowers) {
  return Far('root', {
    buildZoe: vatAdminSvc => makeZoeKit(vatAdminSvc),
  });
}
