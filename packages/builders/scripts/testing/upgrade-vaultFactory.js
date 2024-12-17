import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '@agoric/vats/src/proposals/upgrade-vaultFactory-proposal.js',
    getManifestCall: [
      'getManifestForVaultFactoryUpgrade',
      {
        contractRef: publishRef(
          install('@agoric/inter-protocol/src/vaultFactory/vaultFactory.js'),
        ),
      },
    ],
  });

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('upgrade-vaults', defaultProposalBuilder);
};
