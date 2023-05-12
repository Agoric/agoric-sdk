import { E } from '@endo/far';

export const upgradeContract = async (
  { consume: { myContractFacets, myStatus } },
  { options: { contractRef } },
) => {
  const status = await myStatus;
  status.upgradeContract = true;
  status.iteration = (status.iteration || 0) + 1;
  status.upgrade = (status.upgrade || 0) + 1;
  console.log('upgradeContract', status);

  const { adminFacet } = await myContractFacets;
  const upgradeResult = await E(adminFacet).upgradeContract(
    contractRef.bundleID,
  );
  console.log({ upgradeResult });
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
          myStatus: true,
        },
      },
    },
    options: {
      contractRef,
    },
  });
