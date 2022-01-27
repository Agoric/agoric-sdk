import { Far } from '@agoric/far';
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

      const zoe1 = Far('zoe without install/startInstance', {
        ...zoeService,
        install: (..._args) => assert.fail('contract installation prohibited'),
        startInstance: (..._args) =>
          assert.fail('contract instantiation prohibited'),
      });

      return harden({
        zoe1,
        zoeService,
        feeMintAccess,
      });
    },
  });
}
