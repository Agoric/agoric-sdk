// noinspection ES6PreferShortImport
import { makeZoe } from '@agoric/zoe';

export function buildRootObject(vatPowers, vatParameters) {
  return harden({
    buildZoe: vatAdminSvc =>
      makeZoe(
        vatAdminSvc,
        vatPowers.getInterfaceOf,
        vatParameters.zcfBundleName,
      ),
  });
}
