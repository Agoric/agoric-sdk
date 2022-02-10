// @ts-check

import { Far } from '@endo/marshal';

import { makeZoeKit } from '@agoric/zoe';

export function buildRootObject(vatPowers) {
  return Far('root', {
    buildZoe: (vatAdminSvc, zcfBundlecap) => {
      const shutdownZoeVat = vatPowers.exitVatWithFailure;
      const { zoeService: zoe } = makeZoeKit(
        vatAdminSvc,
        zcfBundlecap,
        shutdownZoeVat,
      );
      return zoe;
    },
  });
}
