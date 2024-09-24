/* eslint-env node */

import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: './upgrade-proposal.js',
    getManifestCall: [
      'getManifestForUpgradeContract',
      {
        contractRef: publishRef(install('./fixed-contract.js')),
      },
    ],
  });

export default async (homeP, endowments) => {
  const helperEndowments = {
    ...endowments,
    cacheDir: endowments.pathResolve(process.cwd(), 'cache'),
  };
  const { writeCoreProposal } = await makeHelpers(homeP, helperEndowments);

  await writeCoreProposal('fix-test-contract', defaultProposalBuilder);
};
