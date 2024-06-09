import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async () => {
  return harden({
    sourceSpec: '@agoric/inter-protocol/src/proposals/add-auction.js',
    getManifestCall: ['getManifestForAddAuction'],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('add-auction', defaultProposalBuilder);
};
