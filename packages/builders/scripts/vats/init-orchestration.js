import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
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

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('gov-orchestration', defaultProposalBuilder);
};
