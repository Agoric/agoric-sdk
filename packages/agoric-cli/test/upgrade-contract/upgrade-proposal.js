import { E } from '@endo/far';

export const upgradeContract = async (
  { consume: { myContractFacets } },
  { options: { contractRef } },
) => {
  const { adminFacet } = await myContractFacets;
  const upgradeResult = await E(adminFacet).upgradeContract(
    contractRef.bundleID,
  );
  console.error(
    'upgraded to incarnation number',
    upgradeResult.incarnationNumber,
  );
};

export const getManifestForUpgradeContract = (_powers, { contractRef }) =>
  harden({
    manifest: {
      [upgradeContract.name]: {
        consume: {
          myContractFacets: true,
        },
      },
    },
    options: {
      contractRef,
    },
  });
