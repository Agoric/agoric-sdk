import { Far } from '@agoric/marshal';
import { makeZoeKit } from '@agoric/zoe';
import { E } from '@agoric/eventual-send';

export function buildRootObject(vatPowers, vatParameters) {
  return Far('root', {
    buildZoe: async (
      adminVat,
      feeIssuerConfig,
      zoeFeesConfig,
      meteringConfig,
    ) => {
      const shutdownZoeVat = vatPowers.exitVatWithFailure;
      const {
        zoeService,
        initialFeeFunds,
        feeMintAccess,
        feeCollectionPurse,
      } = makeZoeKit(
        adminVat,
        shutdownZoeVat,
        feeIssuerConfig,
        zoeFeesConfig,
        meteringConfig,
        vatParameters.zcfBundleName,
      );
      await E(feeCollectionPurse).deposit(initialFeeFunds);
      return harden({
        zoeService,
        feeMintAccess,
        feeCollectionPurse,
      });
    },
  });
}
