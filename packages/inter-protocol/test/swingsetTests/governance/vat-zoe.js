import { Far } from '@endo/marshal';

import { makeZoeKit } from '@agoric/zoe';
import { Stable } from '@agoric/vats/src/tokens.js';

/** @type {BuildRootObjectForTestVat} */
export function buildRootObject(vatPowers) {
  return Far('root', {
    buildZoe: vatAdminSvc => {
      const shutdownZoeVat = vatPowers.exitVatWithFailure;
      const { zoeService: zoe, feeMintAccess } = makeZoeKit(
        vatAdminSvc,
        shutdownZoeVat,
        {
          name: Stable.symbol,
          assetKind: Stable.assetKind,
          displayInfo: Stable.displayInfo,
        },
      );

      return { zoe, feeMintAccess };
    },
  });
}
