import { E } from '@endo/far';

export const upgradeVaults = async (
  powers,
  { options: { vaultFactoryRef } },
) => {
  const {
    consume: { vaultFactoryKit: vaultFactoryKitP },
  } = powers;

  const { adminFacet, privateArgs } = await vaultFactoryKitP;
  const result = await E(adminFacet).upgradeContract(
    vaultFactoryRef.bundleID,
    privateArgs,
  );

  console.log('Upgrade Resulted With: ', result);
};

/** @type {import('@agoric/vats/src/core/lib-boot').BootstrapManifest} */
const manifest = {
  [upgradeVaults.name]: {
    // include rationale for closely-held, high authority capabilities
    consume: {
      vaultFactoryKit: `to upgrade vaultFactory using its adminFacet`,
    },
  },
};
harden(manifest);

export const getManifestVaultsUpgrade = (_powers, { vaultFactoryRef }) => {
  return harden({
    manifest,
    options: { vaultFactoryRef },
  });
};
