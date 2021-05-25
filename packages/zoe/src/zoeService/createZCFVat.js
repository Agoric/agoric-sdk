import { E } from '@agoric/eventual-send';

import zcfContractBundle from '../../bundles/bundle-contractFacet';

/**
 * Attenuate the power of vatAdminSvc by restricting it such that only
 * ZCF Vats can be created.
 *
 * @param {VatAdminSvc} vatAdminSvc
 * @param {string=} zcfBundleName
 * @returns {CreateZCFVat}
 */
export const setupCreateZCFVat = (vatAdminSvc, zcfBundleName) => {
  /** @type {CreateZCFVat} */
  const createZCFVat = () =>
    zcfBundleName
      ? E(vatAdminSvc).createVatByName(zcfBundleName)
      : E(vatAdminSvc).createVat(zcfContractBundle);
  return createZCFVat;
};
