// noinspection ES6PreferShortImport
import { makeZoe } from '../../../src/zoeService/zoe';

export function buildRootObject(_vatPowers) {
  return harden({
    buildZoe: vatAdminSvc => makeZoe(vatAdminSvc),
  });
}
