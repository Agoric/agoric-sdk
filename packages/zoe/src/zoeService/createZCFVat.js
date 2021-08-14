import { E } from '@agoric/eventual-send';

import zcfContractBundle from '../../bundles/bundle-contractFacet.js';

/**
 * Attenuate the power of vatAdminSvc by restricting it such that only
 * ZCF Vats can be created.
 *
 * @param {VatAdminSvc} vatAdminSvc
 * @param {Computrons} initial
 * @param {Computrons} threshold
 * @param {string=} zcfBundleName
 * @returns {CreateZCFVat}
 */
export const setupCreateZCFVat = (
  vatAdminSvc,
  initial,
  threshold,
  zcfBundleName = undefined,
) => {
  /** @type {CreateZCFVat} */
  const createZCFVat = async () => {
    const meter = await E(vatAdminSvc).createMeter(initial, threshold);
    const rootAndAdminNodeP =
      typeof zcfBundleName === 'string'
        ? E(vatAdminSvc).createVatByName(zcfBundleName, { meter })
        : E(vatAdminSvc).createVat(zcfContractBundle, { meter });
    const rootAndAdminNode = await rootAndAdminNodeP;
    return harden({ meter, ...rootAndAdminNode });
  };
  return createZCFVat;
};
