import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForUpgradingBoard } from '@agoric/vats/src/proposals/upgrade-board-proposal.js';

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '@agoric/vats/src/proposals/upgrade-board-proposal.js',
    getManifestCall: [
      getManifestForUpgradingBoard.name,
      {
        boardRef: publishRef(install('@agoric/vats/src/vat-board.js')),
      },
    ],
  });

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('upgrade-board', defaultProposalBuilder);
};
