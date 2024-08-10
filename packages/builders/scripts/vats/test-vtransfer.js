import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async _powers =>
  harden({
    sourceSpec: '@agoric/vats/src/proposals/vtransfer-echoer.js',
    getManifestCall: [
      'getManifestForVtransferEchoer',
      {
        target: 'agoric1vtransfertest',
      },
    ],
  });

export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('test-vtransfer', defaultProposalBuilder);
};
