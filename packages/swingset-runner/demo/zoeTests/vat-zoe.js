// noinspection ES6PreferShortImport
import { makeZoe } from '@agoric/zoe';

export function buildRootObject(_vatPowers, vatParameters) {
  return harden({
    buildZoe: vatAdminSvc => makeZoe(vatAdminSvc, vatParameters.zcfBundleName),
  });
}
