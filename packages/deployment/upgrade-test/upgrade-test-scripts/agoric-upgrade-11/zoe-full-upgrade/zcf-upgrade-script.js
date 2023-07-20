// to turn on ts-check:
/* global E */

// import { E } from "@endo/far";

const ZCF_BUNDLE_ID =
  'b1-c4b3d8bf11cfbcc90ced7e1a8a936d368098360bb01aa4c70a750a39f56dc9d87c10547e825585ce11ceeca5b24d7093bdef04843ac8ac6e90e661b1235bf69b';
const ZOE_BUNDLE_ID =
  'b1-86cf276ab9320d56f23534b8045b6f5d5ad1f2064a9a630f14b8e40763caf5546ee48f2863b4ae9d4c0c7e96409bdbd4961763914ce16e296e24952651ec2b3f';

console.info('zoe upgrade: evaluating script');

/*
 * Test a full upgrade of Zzoe and ZCF.
 * This will include a change to Zoe's code, and a call to Zoe to change the ZCF
 * code that will get used for new and upgraded contracts.
 */
const upgradeZoeAndZcf = async powers => {
  console.info('upgradeZoeAndZcf');
  const {
    consume: { vatStore, vatAdminSvc },
  } = powers;

  const newZoeBundleCap = await E(vatAdminSvc).getBundleCap(ZOE_BUNDLE_ID);
  const { adminNode, root: zoeRoot } = await E(vatStore).get('zoe');

  await E(adminNode).upgrade(newZoeBundleCap, {});

  const zoeConfigFacet = await E(zoeRoot).getZoeConfigFacet();
  await E(zoeConfigFacet).updateZcfBundleId(ZCF_BUNDLE_ID);
};

upgradeZoeAndZcf;
