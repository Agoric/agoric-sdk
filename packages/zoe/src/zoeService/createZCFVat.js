import { E } from '@endo/eventual-send';

export const getZcfBundleCap = (zcfSpec, vatAdminSvc) => {
  let zcfBundleCapP;
  if (zcfSpec.bundleCap) {
    zcfBundleCapP = zcfSpec.bundleCap;
  } else if (zcfSpec.name) {
    zcfBundleCapP = E(vatAdminSvc).getNamedBundleCap(zcfSpec.name);
  } else if (zcfSpec.id) {
    zcfBundleCapP = E(vatAdminSvc).getBundleCap(zcfSpec.id);
  } else {
    const keys = Object.keys(zcfSpec).join(',');
    assert.fail(`setupCreateZCFVat: bad zcfSpec, has keys '${keys}'`);
  }

  return zcfBundleCapP;
};

/**
 * Attenuate the power of vatAdminSvc by restricting it such that only
 * ZCF Vats can be created.
 *
 * @param {VatAdminSvc} vatAdminSvc
 * @param {ERef<BundleCap>} zcfBundleCapP
 * @param {() => Issuer} getInvitationIssuer
 * @param {() => ZoeService} getZoeService
 * @returns {CreateZCFVat}
 */
export const setupCreateZCFVat = (
  vatAdminSvc,
  zcfBundleCapP,
  getInvitationIssuer,
  getZoeService,
) => {
  /** @type {CreateZCFVat} */
  const createZCFVat = async contractBundleCap => {
    /** @type {BundleCap} */
    const zcfBundleCap = await zcfBundleCapP;
    assert(zcfBundleCap, `setupCreateZCFVat did not get bundleCap`);
    const rootAndAdminNodeP = E(vatAdminSvc).createVat(zcfBundleCap, {
      name: 'zcf',
      vatParameters: {
        contractBundleCap,
        zoeService: getZoeService(),
        invitationIssuer: getInvitationIssuer(),
      },
    });
    const rootAndAdminNode = await rootAndAdminNodeP;
    return rootAndAdminNode;
  };
  return createZCFVat;
};
