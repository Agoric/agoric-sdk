import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForUpgradingBoard } from '@agoric/vats/src/proposals/upgrade-board-proposal.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
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

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('upgrade-board', defaultProposalBuilder);
};
