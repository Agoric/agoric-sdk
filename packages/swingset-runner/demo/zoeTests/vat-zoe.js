// noinspection ES6PreferShortImport
import { makeZoe } from '@agoric/zoe';

export function buildRootObject(_vatPowers, vatParameters) {
  return Far('root', {
    buildZoe: vatAdminSvc => makeZoe(vatAdminSvc, vatParameters.zcfBundleName),
  });
}
