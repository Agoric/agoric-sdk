import { makeZoe } from '@agoric/zoe';

export function buildRootObject(_vatPowers, vatParameters) {
  return harden({
    buildZoe: adminVat => makeZoe(adminVat, vatParameters.zcfBundleName),
  });
}
