import { E } from '@agoric/eventual-send';

/**
 * Attenuate the power of vatAdminSvc by restricting it such that only
 * ZCF Vats can be created.
 *
 * @param {VatAdminSvc} vatAdminSvc
 * @param {string=} zcfBundleName
 * @returns {CreateZCFVat}
 */
export const setupCreateZCFVat = (vatAdminSvc, zcfBundleName = 'zcf') => {
  /** @type {CreateZCFVat} */
  const createZCFVat = async () => {
    assert.typeof(zcfBundleName, 'string');
    const rootAndAdminNodeP = E(vatAdminSvc).createVatByName(zcfBundleName);
    const rootAndAdminNode = await rootAndAdminNodeP;
    return rootAndAdminNode;
  };
  return createZCFVat;
};
