import { Far } from '@agoric/marshal';
import { makeZoeKit } from '@agoric/zoe';

export function buildRootObject(vatPowers, vatParameters) {
  return Far('root', {
    buildZoe: adminVat => {
      const shutdownZoeVat = vatPowers.exitVatWithFailure;
      makeZoeKit(adminVat, shutdownZoeVat, vatParameters.zcfBundleName);
    },
  });
}
