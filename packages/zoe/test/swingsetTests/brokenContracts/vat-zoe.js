// noinspection ES6PreferShortImport
import { makeZoe } from '../../../src/zoeService/zoe';

export function buildRootObject(vatPowers) {
  return harden({
    buildZoe: vatAdminSvc => makeZoe(vatAdminSvc, vatPowers.getInterfaceOf),
  });
}
