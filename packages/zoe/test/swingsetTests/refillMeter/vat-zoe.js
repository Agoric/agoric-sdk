// @ts-check

import { Far } from '@agoric/marshal';

// noinspection ES6PreferShortImport
import { E } from '@agoric/eventual-send';
import { makeZoeKit } from '../../../src/zoeService/zoe.js';

export function buildRootObject(vatPowers) {
  return Far('root', {
    buildZoe: async (
      vatAdminSvc,
      feeIssuerConfig,
      zoeFeesConfig,
      meteringConfig,
    ) => {
      const shutdownZoeVat = vatPowers.exitVatWithFailure;
      const { zoeService, initialFeeFunds } = makeZoeKit(
        vatAdminSvc,
        shutdownZoeVat,
        feeIssuerConfig,
        zoeFeesConfig,
        meteringConfig,
      );
      const feePurse = E(zoeService).makeFeePurse();
      const zoe = E(zoeService).bindDefaultFeePurse(feePurse);
      await E(feePurse).deposit(initialFeeFunds);
      return harden({
        zoe,
        feePurse,
      });
    },
  });
}
