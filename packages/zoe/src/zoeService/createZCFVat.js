import { E } from '@agoric/eventual-send';
import { passStyleOf } from '@endo/marshal';

/**
 * Attenuate the power of vatAdminSvc by restricting it such that only
 * ZCF Vats can be created.
 *
 * @param {VatAdminSvc} vatAdminSvc
 * @param {BundleCap} zcfBundlecap
 * @returns {CreateZCFVat}
 */
export const setupCreateZCFVat = (vatAdminSvc, zcfBundlecap) => {
  /** @type {CreateZCFVat} */
  const createZCFVat = async () => {
    assert.typeof(zcfBundlecap, 'object');
    assert.equal(passStyleOf(zcfBundlecap), 'remotable');
    const rootAndAdminNodeP = E(vatAdminSvc).createVat(zcfBundlecap);
    const rootAndAdminNode = await rootAndAdminNodeP;
    return rootAndAdminNode;
  };
  return createZCFVat;
};
