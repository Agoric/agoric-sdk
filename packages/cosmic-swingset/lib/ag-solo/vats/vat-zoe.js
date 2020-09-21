import { makeZoe } from '@agoric/zoe';

export function buildRootObject(vatPowers, vatParameters) {
  return harden({
    buildZoe: adminVat =>
      makeZoe(adminVat, vatPowers.getInterfaceOf, vatParameters.zcfBundleName),
  });
}
