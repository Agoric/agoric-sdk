// @ts-check

import { Far } from '@endo/marshal';

import { makeZoeKit } from '@agoric/zoe';

import '@agoric/swingset-vat/src/kernel/vatManager/types.js';

/** @type {BuildRootObjectForTestVat} */
export function buildRootObject(vatPowers) {
  return Far('root', {
    buildZoe: vatAdminSvc => {
      const shutdownZoeVat = vatPowers.exitVatWithFailure;
      const { zoeService: zoe, feeMintAccess } = makeZoeKit(
        vatAdminSvc,
        shutdownZoeVat,
      );

      return { zoe, feeMintAccess };
    },
  });
}
