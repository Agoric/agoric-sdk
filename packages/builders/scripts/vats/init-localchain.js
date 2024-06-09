import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '@agoric/vats/src/proposals/localchain-proposal.js',
    getManifestCall: [
      'getManifestForLocalChain',
      {
        localchainRef: publishRef(
          install('@agoric/vats/src/vat-localchain.js'),
        ),
      },
    ],
  });

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('gov-localchain', defaultProposalBuilder);
};
