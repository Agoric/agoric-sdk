import { E } from '@agoric/eventual-send';

/**
 * Attenuate the power of vatAdminSvc by restricting it such that only
 * ZCF Vats can be created.
 *
 * @param {VatAdminSvc} vatAdminSvc
 * @param {ZCFSpec} zcfSpec
 * @returns {CreateZCFVat}
 */
export const setupCreateZCFVat = (vatAdminSvc, zcfSpec) => {
  /** @type {CreateZCFVat} */
  const createZCFVat = async () => {
    let bundlecapP;
    if (zcfSpec.bundlecap) {
      bundlecapP = Promise.resolve(zcfSpec.bundlecap);
    } else if (zcfSpec.name) {
      bundlecapP = E(vatAdminSvc).getNamedBundlecap(zcfSpec.name);
    } else {
      assert(zcfSpec.id);
      bundlecapP = E(vatAdminSvc).getBundlecap(zcfSpec.id);
    }
    const bundlecap = await bundlecapP;
    assert(bundlecap);
    const rootAndAdminNodeP = E(vatAdminSvc).createVat(bundlecap);
    const rootAndAdminNode = await rootAndAdminNodeP;
    return rootAndAdminNode;
  };
  return createZCFVat;
};
