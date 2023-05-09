import { Far } from '@endo/far';
import { makeZoeKit } from '@agoric/zoe';

const BUILD_PARAMS_KEY = 'buildZoeParams';

export function buildRootObject(vatPowers, _vatParams, zoeBaggage) {
  const shutdownZoeVat = vatPowers.exitVatWithFailure;

  if (zoeBaggage.has(BUILD_PARAMS_KEY)) {
    const { feeIssuerConfig, zcfBundleName } = zoeBaggage.get(BUILD_PARAMS_KEY);
    makeZoeKit(
      // For now Zoe will rewire vatAdminSvc on its own
      undefined,
      shutdownZoeVat,
      feeIssuerConfig,
      { name: zcfBundleName },
      zoeBaggage,
    );
  }

  return Far('root', {
    buildZoe: async (adminVat, feeIssuerConfig, zcfBundleName) => {
      assert(zcfBundleName, `vat-zoe requires zcfBundleName`);

      const vatAdminSvc = await adminVat;

      zoeBaggage.init(
        BUILD_PARAMS_KEY,
        harden({ vatAdminSvc, feeIssuerConfig, zcfBundleName }),
      );

      const { zoeService, feeMintAccess } = makeZoeKit(
        adminVat,
        shutdownZoeVat,
        feeIssuerConfig,
        { name: zcfBundleName },
        zoeBaggage,
      );

      return harden({
        zoeService,
        feeMintAccess,
      });
    },
  });
}
