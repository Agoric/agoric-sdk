// @ts-check

import { Far } from '@endo/far';

import { makeZoeKit } from '@agoric/zoe';

export function buildRootObject(vatPowers, vatParameters) {
  return Far('root', {
    buildZoe: vatAdminSvc => {
      const shutdownZoeVat = vatPowers.exitVatWithFailure;
      const { zoeService: zoe } = makeZoeKit(vatAdminSvc, shutdownZoeVat, {
        name: vatParameters.zcfBundleName,
      });
      return zoe;
    },
  });
}
