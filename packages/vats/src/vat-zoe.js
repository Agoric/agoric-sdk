import { E, Far } from '@agoric/far';
import { makeZoeKit } from '@agoric/zoe';

export function buildRootObject(vatPowers, vatParameters) {
  return Far('root', {
    buildZoe: async (adminVat, feeIssuerConfig) => {
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
