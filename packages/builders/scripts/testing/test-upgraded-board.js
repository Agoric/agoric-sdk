import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForTestUpgradedBoard } from '@agoric/vats/src/proposals/testUpgradedBoard.js';

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async () =>
  harden({
    sourceSpec: '@agoric/vats/src/proposals/testUpgradedBoard.js',
    getManifestCall: [getManifestForTestUpgradedBoard.name],
  });

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('testUpgradedBoard', defaultProposalBuilder);
};
