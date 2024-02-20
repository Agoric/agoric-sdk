import { makeHelpers } from '@agoric/deploy-script-support';
import { makeInstallCache } from '../src/proposals/utils.js';
import { getManifestVaultsUpgrade } from '../src/proposals/vaultsLiquidationVisibility.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').ProposalBuilder} */
export const vaultsUpgradeProposalBuilder = async ({
  publishRef,
  install: install0,
  wrapInstall,
}) => {
  const install = wrapInstall ? wrapInstall(install0) : install0;

  return harden({
    sourceSpec: '../src/proposals/vaultsLiquidationVisibility.js',
    getManifestCall: [
      getManifestVaultsUpgrade.name,
      {
        vaultFactoryRef: publishRef(
          install(
            '../src/vaultFactory/vaultFactory.js',
            '../bundles/bundle-vaultFactory.js',
          ),
        ),
      },
    ],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);

  const tool = await makeInstallCache(homeP, {
    loadBundle: spec => import(spec),
  });

  await writeCoreProposal('upgrade-vaults-liq-visibility', opts =>
    // @ts-expect-error XXX makeInstallCache types
    vaultsUpgradeProposalBuilder({ ...opts, wrapInstall: tool.wrapInstall }),
  );
};
