import { Far } from '@endo/far';
import { makeZoeKit } from '@agoric/zoe';

export function buildRootObject(vatPowers, vatParameters) {
  return Far('root', {
    buildZoe: async (adminVat, feeIssuerConfig) => {
      const shutdownZoeVat = vatPowers.exitVatWithFailure;
      const { zoeService, feeMintAccess } = makeZoeKit(
        adminVat,
        shutdownZoeVat,
        feeIssuerConfig,
        vatParameters.zcfBundleName,
      );
      return harden({
        zoeService,
        feeMintAccess,
      });
    },
  });
}
