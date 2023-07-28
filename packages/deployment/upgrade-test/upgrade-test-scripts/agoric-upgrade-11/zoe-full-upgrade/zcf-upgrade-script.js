// to turn on ts-check:
/* global E */

// import { E } from "@endo/far";

const ZCF_BUNDLE_ID =
  'b1-3781ce16d40590a41588a472795d2487dbdd9c5f055ac9a82ff52a872cf24f1eb35c6f45d248bcbe13c12d2c1356aecaf5e81b73155ab109499f285ef83fdfd9';
const ZOE_BUNDLE_ID =
  'b1-51ffc8e388df8dff7d16b670f5c2c5a2de51f23b7a9a411e90eb222c4a673b3845db2bd925bbf5f9e2bff5fb40e65aa2d366f45c186dd81d0f1517d456b8de58';

console.info('zoe upgrade: evaluating script');

/*
 * Test a full upgrade of Zoe and ZCF.
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
