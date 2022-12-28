import { Far } from '@endo/marshal';

import { makeZoeKit } from '../../../src/zoeService/zoe.js';

export function buildRootObject(vatPowers) {
  return Far('root', {
    buildZoe: async vatAdminSvc => {
      const shutdownZoeVat = vatPowers.exitVatWithFailure;
      const {
        zoeServices: { zoeService: zoe, feeMintAccessRetriever },
      } = makeZoeKit(vatAdminSvc, shutdownZoeVat);

      return harden({ zoe, feeMintAccessRetriever });
    },
  });
}
