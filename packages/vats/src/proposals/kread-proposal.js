import { E } from '@endo/far';

/**
 * @param {BootstrapPowers & {
 *   consume: { kreadKit: any };
 * }} powers
 */
export const repairKread = async ({ consume: { kreadKit: kreadKitP } }) => {
  console.log('repairSubscribers');

  const kreadKit = await kreadKitP;
  const creatorFacet = kreadKit.creatorFacet;
  console.log(`KREAd creatorFacet`, creatorFacet);
  await E(creatorFacet).reviveMarketExitSubscribers();
  console.log('KREAd subscribers were revived!');
};

export const getManifestForKread = _powers => ({
  manifest: {
    [repairKread.name]: {
      consume: { kreadKit: true },
    },
  },
});
