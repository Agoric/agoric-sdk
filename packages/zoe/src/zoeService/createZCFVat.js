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
export const setupCreateZCFVat = (vatAdminSvc, zcfBundleName = undefined) => {
  /** @type {CreateZCFVat} */
  const createZCFVat = () =>
    typeof zcfBundleName === 'string'
      ? E(vatAdminSvc).createVatByName(zcfBundleName, { metered: true })
      : E(vatAdminSvc).createVat(zcfContractBundle, { metered: true });
  return createZCFVat;
};
