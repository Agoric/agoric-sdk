import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '@agoric/inter-protocol/src/proposals/upgrade-vaults.js',
    getManifestCall: [
      'getManifestForUpgradeVaults',
      {
        VaultFactoryRef: publishRef(
          install(
            '@agoric/inter-protocol/src/vaultFactory/vaultFactory.js',
            '../bundles/bundle-vaultFactory.js',
          ),
        ),
      },
    ],
  });

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('upgrade-vaults', defaultProposalBuilder);
};
