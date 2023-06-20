/* global process */

// eslint-disable-next-line import/no-extraneous-dependencies
import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').ProposalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: './init-proposal.js',
    getManifestCall: [
      'getManifestForInitContract',
      {
        contractRef: publishRef(install('./buggy-contract.js')),
      },
    ],
  });

export default async (homeP, endowments) => {
  const helperEndowments = {
    ...endowments,
    cacheDir: endowments.pathResolve(process.cwd(), 'cache'),
  };
  const { writeCoreProposal } = await makeHelpers(homeP, helperEndowments);

  await writeCoreProposal('buggy-test-contract', defaultProposalBuilder);
};
