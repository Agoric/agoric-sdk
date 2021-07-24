// @ts-check

import { Far } from '@agoric/marshal';

// noinspection ES6PreferShortImport
import { makeZoe } from '../../../src/zoeService/zoe';
import { useChargeAccount } from '../../../src/useChargeAccount';

export function buildRootObject(_vatPowers) {
  return Far('root', {
    buildZoe: vatAdminSvc => {
      const { zoeService } = makeZoe(vatAdminSvc);
      const zoe = useChargeAccount(zoeService);
      return zoe;
    },
  });
}
