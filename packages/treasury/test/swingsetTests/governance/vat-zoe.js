// @ts-check

import { Far } from '@agoric/marshal';

// noinspection ES6PreferShortImport
import { makeZoeKit } from '@agoric/zoe';

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
