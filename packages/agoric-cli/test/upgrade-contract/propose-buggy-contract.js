/* eslint-env node */

import { makeHelpers } from '@agoric/deploy-script-support';

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/** @type {CoreEvalBuilder} */
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

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const helperEndowments = {
    ...endowments,
    cacheDir: endowments.pathResolve(process.cwd(), 'cache'),
  };
  const { writeCoreProposal } = await makeHelpers(homeP, helperEndowments);

  await writeCoreProposal('buggy-test-contract', defaultProposalBuilder);
};
