import { E } from '@endo/eventual-send';

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
    const rootAndAdminNodeP =
      typeof zcfBundleName === 'string'
        ? E(vatAdminSvc).createVatByName(zcfBundleName)
        : E(vatAdminSvc).createVat(zcfContractBundle);
    const rootAndAdminNode = await rootAndAdminNodeP;
    return rootAndAdminNode;
  };
  return createZCFVat;
};
