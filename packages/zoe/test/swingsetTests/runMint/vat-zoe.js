// @ts-check

import { Far } from '@agoric/marshal';

// noinspection ES6PreferShortImport
import { makeZoeKit } from '../../../src/zoeService/zoe.js';

export function buildRootObject(vatPowers) {
  return Far('root', {
    buildZoe: async vatAdminSvc => {
      const shutdownZoeVat = vatPowers.exitVatWithFailure;
      const { zoeService: zoe, feeMintAccess } = makeZoeKit(
        vatAdminSvc,
        shutdownZoeVat,
      );
      return harden({ zoe, feeMintAccess });
    },
  });
}
