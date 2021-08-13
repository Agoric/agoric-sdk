// @ts-check

import { Far } from '@agoric/marshal';

import { makeZoeKit } from '@agoric/zoe';
import { makeAndApplyFeePurse } from '@agoric/zoe/src/applyFeePurse.js';

export function buildRootObject(vatPowers) {
  return Far('root', {
    buildZoe: vatAdminSvc => {
      const shutdownZoeVat = vatPowers.exitVatWithFailure;
      const { zoeService } = makeZoeKit(vatAdminSvc, shutdownZoeVat);
      const { zoeService: zoe } = makeAndApplyFeePurse(zoeService);
      return zoe;
    },
  });
}
