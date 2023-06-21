/* global process */

// eslint-disable-next-line import/no-extraneous-dependencies
import { makeHelpers } from '@agoric/deploy-script-support';

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

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const helperEndowments = {
    ...endowments,
    cacheDir: endowments.pathResolve(process.cwd(), 'cache'),
  };
  const { writeCoreProposal } = await makeHelpers(homeP, helperEndowments);

  await writeCoreProposal('fix-test-contract', defaultProposalBuilder);
};
