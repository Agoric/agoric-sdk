import { Far } from '@agoric/marshal';
import { makeZoeKit } from '@agoric/zoe';

export function buildRootObject(_vatPowers, vatParameters) {
  return Far('root', {
    buildZoe: adminVat => makeZoeKit(adminVat, vatParameters.zcfBundleName),
  });
}
