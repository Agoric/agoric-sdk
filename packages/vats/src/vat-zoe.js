import { Far } from '@endo/far';
import { makeZoeKit } from '@agoric/zoe';

export function buildRootObject(vatPowers) {
  return Far('root', {
    buildZoe: async (adminVat, feeIssuerConfig, zcfBundleName) => {
      const shutdownZoeVat = vatPowers.exitVatWithFailure;
      assert(zcfBundleName, `vat-zoe requires zcfBundleName`);
      const { zoeService, feeMintAccess } = makeZoeKit(
        adminVat,
        shutdownZoeVat,
        feeIssuerConfig,
        { name: zcfBundleName },
      );
      return harden({
        zoeService,
        feeMintAccess,
      });
    },
  });
}
