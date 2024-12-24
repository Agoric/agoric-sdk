import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForTestUpgradedBoard } from '@agoric/vats/src/proposals/testUpgradedBoard.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async () =>
  harden({
    sourceSpec: '@agoric/vats/src/proposals/testUpgradedBoard.js',
    getManifestCall: [getManifestForTestUpgradedBoard.name],
  });

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('testUpgradedBoard', defaultProposalBuilder);
};
