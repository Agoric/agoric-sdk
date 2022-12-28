import { Far } from '@endo/far';
import { makeZoeKit } from '@agoric/zoe';

export function buildRootObject(vatPowers, _vatParams, zoeBaggage) {
  return Far('root', {
    buildZoe: async (adminVat, feeIssuerConfig, zcfBundleName) => {
      const shutdownZoeVat = vatPowers.exitVatWithFailure;
      assert(zcfBundleName, `vat-zoe requires zcfBundleName`);
      const {
        zoeServices: { zoeService, feeMintAccessRetriever },
      } = makeZoeKit(
        adminVat,
        shutdownZoeVat,
        feeIssuerConfig,
        { name: zcfBundleName },
        zoeBaggage,
      );
      return harden({
        zoeService,
        feeMintAccessRetriever,
      });
    },
  });
}
