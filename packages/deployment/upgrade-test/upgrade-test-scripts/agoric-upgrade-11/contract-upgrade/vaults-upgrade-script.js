// to turn on ts-check:
/* global E */

// import { E } from "@endo/far";

const GOV_BUNDLE_ID = 'b1-';
const VAULTS_BUNDLE_ID = 'b1-';

console.info('Vaults upgrade: evaluating script');

/*
 * Test an upgrade of the VaultFactory and its governing contract.
 */
const upgradeVaultFactory = async powers => {
  console.info('upgrade vaultFactory');
  const {
    consume: {
      chainStorage,
      vatAdminSvc,
      vaultFactoryKit: {
        governorAdminFacet,
        adminFacet: vaultsAdminFacet,
        instance,
        privateArgs,
      },
    },
  } = powers;

  const newGovernorBundleCap = await E(vatAdminSvc).getBundleCap(GOV_BUNDLE_ID);
  const newVaultsBundleCap = await E(vatAdminSvc).getBundleCap(
    VAULTS_BUNDLE_ID,
  );

  // consider modifying privateArgs.
  await E(governorAdminFacet).upgrade(newGovernorBundleCap, {});

  // not write, but perhaps visible?
  const storageNode = await E(chainStorage).makeChildNode('vaults');
  await E(vaultsAdminFacet).upgrade(newVaultsBundleCap, { storageNode });
};

upgradeVaultFactory;
