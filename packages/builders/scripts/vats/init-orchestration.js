import { makeHelpers } from '@agoric/deploy-script-support';

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '@agoric/orchestration/src/proposals/orchestration-proposal.js',
    getManifestCall: [
      'getManifestForOrchestration',
      {
        orchestrationRef: publishRef(
          install('@agoric/orchestration/src/vat-orchestration.js'),
        ),
      },
    ],
  });

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('gov-orchestration', defaultProposalBuilder);
};
