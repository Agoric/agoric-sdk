import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async () =>
  harden({
    sourceSpec: '@agoric/vats/src/proposals/resetRoundIds.js',
    getManifestCall: ['getManifestForResetRoundIds'],
  });

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('reset-round-ids', defaultProposalBuilder);
};
