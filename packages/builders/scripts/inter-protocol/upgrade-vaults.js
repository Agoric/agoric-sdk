import { makeHelpers } from '@agoric/deploy-script-support';
import { makeInstallCache } from '@agoric/inter-protocol/src/proposals/utils.js';
import { getManifestVaultsUpgrade } from '@agoric/inter-protocol/src/proposals/vaultsUpgrade.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
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
          install('@agoric/inter-protocol/src/vaultFactory/vaultFactory.js'),
        ),
      },
    ],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  await writeCoreEval(
    'upgrade-vaults-liq-visibility',
    vaultsUpgradeProposalBuilder,
  );
};
