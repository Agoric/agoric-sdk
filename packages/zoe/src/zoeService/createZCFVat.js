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
    const meter = await E(vatAdminSvc).createUnlimitedMeter();
    return typeof zcfBundleName === 'string'
      ? E(vatAdminSvc).createVatByName(zcfBundleName, { meter })
      : E(vatAdminSvc).createVat(zcfContractBundle, { meter });
  };
  return createZCFVat;
};
