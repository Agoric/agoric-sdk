import { Far } from '@agoric/marshal';
import { makeZoe } from '@agoric/zoe';

export function buildRootObject(_vatPowers, vatParameters) {
  return Far('root', {
    buildZoe: (adminVat, runIssuerPromise) =>
      makeZoe(adminVat, runIssuerPromise, vatParameters.zcfBundleName),
  });
}
