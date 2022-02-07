/* eslint-disable import/no-extraneous-dependencies */
import { Far } from '@endo/marshal';
import { makeZoe } from '@agoric/zoe';

export function buildRootObject(_vatPowers, vatParameters) {
  return Far('root', {
    buildZoe: adminVat => makeZoe(adminVat, vatParameters.zcfBundleName),
  });
}
