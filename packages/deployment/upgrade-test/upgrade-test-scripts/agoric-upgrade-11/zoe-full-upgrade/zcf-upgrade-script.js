// to turn on ts-check:
/* global E */

// import { E } from "@endo/far";

const ZCF_BUNDLE_ID =
  'b1-8674abc9a8de561c4a33fb475b87be75708cd901c37931fd5ac1f40d3ee99937a459a6ca7b4a8b7907512626caf98c125f22c15384826e37dfc899dc0bf2a63a';
const ZOE_BUNDLE_ID =
  'b1-68963663488ee6d178293b559b9d902cea1857dddac257f08540cb9748647d0218a991ce02cf9f61e1e49cca3979b20473103a7fee509cf808de43e323afab54';

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
