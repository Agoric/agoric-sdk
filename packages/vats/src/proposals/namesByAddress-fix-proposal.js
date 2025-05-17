/** @file core eval proposal to fix namesByAddress by upgrading vat-provisioning */
import { E } from '@endo/far';

const vatUpgrade = /** @type {const} */ ({
  name: 'provisioning',
  opts: {
    // vatParameters not used by provisioning vat
    upgradeMessage: 'fix namesByAddress',
  },
});

/**
 * Upgrade provisioning vat and replace namesByAddress in bootstrap promise
 * space
 *
 * @param {BootstrapPowers} powers
 * @param {object} options
 * @param {{ provisioningRef: { bundleID: string } }} options.options
 *
 * @typedef {string} BundleID
 */
export const upgradeProvisioningVat = async (powers, options) => {
  console.log('upgradeProvisioningVat...');
  const { vatStore, vatAdminSvc } = powers.consume;
  const { namesByAddress: resolver } = powers.produce;

  const { name, opts } = vatUpgrade;
  const { bundleID } = options.options.provisioningRef;
  const vatInfo = await E(vatStore).get(name);
  console.log(vatUpgrade.name, vatInfo, bundleID);
  const { root, adminNode } = vatInfo;
  const bundleCap = await E(vatAdminSvc).getBundleCap(bundleID);
  const incarnation = await E(adminNode).upgrade(bundleCap, opts);
  console.log({ ...vatUpgrade, incarnation });

  const { namesByAddress } = await E(root).getNamesByAddressKit();
  resolver.reset();
  resolver.resolve(namesByAddress);
};

export const getManifestForProvisioning = (_powers, { provisioningRef }) => ({
  /** @type {import('../core/lib-boot').BootstrapManifest} */
  manifest: {
    [upgradeProvisioningVat.name]: {
      consume: {
        vatStore: true,
        vatAdminSvc: true,
      },
      produce: {
        namesByAddress: true,
      },
    },
  },
  options: { provisioningRef },
});
