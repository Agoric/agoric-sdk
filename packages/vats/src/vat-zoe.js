import { Far } from '@endo/far';
import { makeZoeKit } from '@agoric/zoe';

export function buildRootObject(vatPowers, vatParameters) {
  return Far('root', {
    buildZoe: async (adminVat, zcfBundlecap, feeIssuerConfig) => {
      const shutdownZoeVat = vatPowers.exitVatWithFailure;
      const { zoeService, feeMintAccess } = makeZoeKit(
        adminVat,
        zcfBundlecap,
        shutdownZoeVat,
        feeIssuerConfig,
      );
      return harden({
        zoeService,
        feeMintAccess,
      });
    },
  });
}
