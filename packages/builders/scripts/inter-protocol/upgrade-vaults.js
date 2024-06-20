import { makeHelpers } from '@agoric/deploy-script-support';
import { makeInstallCache } from '@agoric/inter-protocol/src/proposals/utils.js';
import { getManifestVaultsUpgrade } from '@agoric/inter-protocol/src/proposals/vaultsUpgrade.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').ProposalBuilder} */
export const vaultsUpgradeProposalBuilder = async ({
  publishRef,
  install: install0,
  wrapInstall,
}) => {
  const install = wrapInstall ? wrapInstall(install0) : install0;

  return harden({
    sourceSpec: '@agoric/inter-protocol/src/proposals/vaultsUpgrade.js',
    getManifestCall: [
      getManifestVaultsUpgrade.name,
      {
        vaultFactoryRef: publishRef(
          install(
            '@agoric/inter-protocol/src/vaultFactory/vaultFactory.js',
            '@agoric/inter-protocol/bundles/bundle-vaultFactory.js',
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
