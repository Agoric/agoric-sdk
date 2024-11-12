import { E } from '@endo/far';

export const upgradeKread = async powers => {
  console.log('LOG: upgrading Kread');

  const {
    consume: { kreadKit: kreadKitP, kreadCommitteeCreatorFacet },
  } = powers;

  const initialPoserInvitation = await E(
    kreadCommitteeCreatorFacet,
  ).getPoserInvitation();

  const { adminFacet, privateArgs } = await kreadKitP;

  const newPrivateArgs = harden({
    ...privateArgs,
    initialPoserInvitation,
  });

  const bundleID =
    'b1-de0eab9300715acb6ef75bafde5c00afb9110b60d2c36736989e08fe12e590ed7b8d2db1174e540e7e02f56026336a76f0837d6daa4ae0ad28e3e336dbe3c559';
  await E(adminFacet).upgradeContract(bundleID, newPrivateArgs);

  console.log('LOG: KREAd contract upgraded!');
};

export const getManifestForUpgradeKread = () => ({
  manifest: {
    [upgradeKread.name]: {
      consume: {
        kreadKit: true,
        kreadCommitteeCreatorFacet: true,
      },
    },
  },
});
