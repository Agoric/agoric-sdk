import { Far } from '@endo/far';
import { makeDurableZoeKit } from '@agoric/zoe';

const BUILD_PARAMS_KEY = 'buildZoeParams';

export function buildRootObject(vatPowers, _vatParams, zoeBaggage) {
  const shutdownZoeVat = vatPowers.exitVatWithFailure;

  let zoeConfigFacet;

  if (zoeBaggage.has(BUILD_PARAMS_KEY)) {
    const { feeIssuerConfig, zcfSpec } = zoeBaggage.get(BUILD_PARAMS_KEY);
    // The return value is `{ zoeService, zoeConfigFacet, feeMintAccess }`. This
    // call only needs zoeConfigFacet because the others have been returned.
    // zoeConfigFacet was added after the first release of Zoe on-chain.
    ({ zoeConfigFacet } = makeDurableZoeKit({
      // For now Zoe will rewire vatAdminSvc on its own
      shutdownZoeVat,
      feeIssuerConfig,
      zcfSpec,
      zoeBaggage,
    }));
  }

  return Far('root', {
    buildZoe: async (adminVat, feeIssuerConfig, zcfBundleName) => {
      assert(zcfBundleName, `vat-zoe requires zcfBundleName`);

      const vatAdminSvc = await adminVat;

      /** @type {ZCFSpec} */
      const zcfSpec = { name: zcfBundleName };

      zoeBaggage.init(
        BUILD_PARAMS_KEY,
        harden({ vatAdminSvc, feeIssuerConfig, zcfSpec }),
      );

      const { zoeService, feeMintAccess } = makeDurableZoeKit({
        vatAdminSvc,
        shutdownZoeVat,
        feeIssuerConfig,
        zcfSpec,
        zoeBaggage,
      });

      return harden({
        zoeService,
        feeMintAccess,
      });
    },
    getZoeConfigFacet: () => zoeConfigFacet,
  });
}

/** @typedef {ReturnType<typeof buildRootObject>} ZoeVat */
