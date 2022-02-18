// @ts-check

import { Far } from '@endo/marshal';

import { makeZoeKit } from '@agoric/zoe';

export const buildRootObject = vatPowers =>
  Far('root', {
    buildZoe: vatAdminSvc => {
      const shutdownZoeVat = vatPowers.exitVatWithFailure;
      const { zoeService: zoe } = makeZoeKit(vatAdminSvc, shutdownZoeVat);
      return zoe;
    },
  });
