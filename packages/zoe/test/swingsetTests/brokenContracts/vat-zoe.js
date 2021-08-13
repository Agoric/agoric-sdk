// @ts-check

import { Far } from '@agoric/marshal';

// noinspection ES6PreferShortImport
import { makeAndApplyFeePurse } from '../../../src/applyFeePurse.js';
import { makeZoeKit } from '../../../src/zoeService/zoe.js';

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
