// @ts-check

import { Far } from '@endo/marshal';

import { makeZoeKit } from '@agoric/zoe';

/** @type {BuildRootObjectForTestVat} */
export const buildRootObject = vatPowers =>
  Far('root', {
    buildZoe: vatAdminSvc => {
      const shutdownZoeVat = vatPowers.exitVatWithFailure;
      const { zoeService: zoe, feeMintAccess } = makeZoeKit(
        vatAdminSvc,
        shutdownZoeVat,
      );
      return { zoe, feeMintAccess };
    },
  });
