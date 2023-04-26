import { E } from '@endo/eventual-send';

const { Fail, quote: q } = assert;

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
    Fail`setupCreateZCFVat: bad zcfSpec, has keys '${q(keys)}'`;
  }

  return zcfBundleCapP;
};
