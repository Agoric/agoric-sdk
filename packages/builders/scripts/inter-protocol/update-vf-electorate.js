import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForUpdateVaultFactoryElectorate } from '@agoric/inter-protocol/src/proposals/update-vf-electorate.js';

/**
 * @file On DevNet, the vaultFactory ended up with an out-of-date electorate.
 * Update it to the current version.
 */

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async () => {
  return harden({
    sourceSpec: '@agoric/inter-protocol/src/proposals/update-vf-electorate.js',
    getManifestCall: [getManifestForUpdateVaultFactoryElectorate.name],
  });
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  await writeCoreEval('update-vaultFactory-electorate', utils =>
    defaultProposalBuilder(utils),
  );
};
