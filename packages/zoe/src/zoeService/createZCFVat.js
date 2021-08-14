import { E } from '@agoric/eventual-send';

import zcfContractBundle from '../../bundles/bundle-contractFacet.js';

/**
 * Attenuate the power of vatAdminSvc by restricting it such that only
 * ZCF Vats can be created.
 *
 * @param {VatAdminSvc} vatAdminSvc
 * @param {string=} zcfBundleName
 * @returns {CreateZCFVat}
 */
export const setupCreateZCFVat = (vatAdminSvc, zcfBundleName = undefined) => {
  /** @type {CreateZCFVat} */
  const createZCFVat = async () => {
    // const remaining = 100_000_000n; // 100M computrons
    // const threshold = 20_000_000n; // notify below 20M
    const remaining = 100_000_000n; // 100M computrons
    const threshold = 10n; // notify below 20M
    const meter = await E(vatAdminSvc).createMeter(remaining, threshold);
    const rootAndAdminNodeP =
      typeof zcfBundleName === 'string'
        ? E(vatAdminSvc).createVatByName(zcfBundleName, { meter })
        : E(vatAdminSvc).createVat(zcfContractBundle, { meter });
    const rootAndAdminNode = await rootAndAdminNodeP;
    return harden({ meter, ...rootAndAdminNode });
  };
  return createZCFVat;
};
