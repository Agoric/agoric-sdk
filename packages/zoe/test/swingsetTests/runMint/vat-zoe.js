// @ts-check

import { Far } from '@endo/marshal';

import { makeZoeKit } from '../../../src/zoeService/zoe.js';

export function buildRootObject(vatPowers) {
  return Far('root', {
    buildZoe: async (vatAdminSvc, zcfBundlecap) => {
      const shutdownZoeVat = vatPowers.exitVatWithFailure;
      const { zoeService: zoe, feeMintAccess } = makeZoeKit(
        vatAdminSvc,
        zcfBundlecap,
        shutdownZoeVat,
      );
      return harden({ zoe, feeMintAccess });
    },
  });
}
