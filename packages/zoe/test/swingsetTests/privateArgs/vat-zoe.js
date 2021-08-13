// @ts-check

import { Far } from '@agoric/marshal';

// noinspection ES6PreferShortImport
import { E } from '@agoric/eventual-send';
import { makeZoeKit } from '../../../src/zoeService/zoe.js';

export function buildRootObject(vatPowers) {
  return Far('root', {
    buildZoe: vatAdminSvc => {
      const shutdownZoeVat = vatPowers.exitVatWithFailure;
      const { zoeService } = makeZoeKit(vatAdminSvc, shutdownZoeVat);
      const feePurse = E(zoeService).makeFeePurse();
      const zoe = E(zoeService).bindDefaultFeePurse(feePurse);
      return zoe;
    },
  });
}
