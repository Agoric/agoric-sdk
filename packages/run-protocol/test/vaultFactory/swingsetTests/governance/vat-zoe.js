// @ts-check

import { Far } from '@endo/marshal';

import { makeZoeKit } from '@agoric/zoe';

/** @type {BuildRootObjectForTestVat} */
export function buildRootObject(vatPowers) {
  return Far('root', {
    buildZoe: (vatAdminSvc, zcfBundlecap) => {
      const shutdownZoeVat = vatPowers.exitVatWithFailure;
      const { zoeService: zoe, feeMintAccess } = makeZoeKit(
        vatAdminSvc,
        zcfBundlecap,
        shutdownZoeVat,
      );

      return { zoe, feeMintAccess };
    },
  });
}
