import { makeHelpers } from '@agoric/deploy-script-support';

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '@agoric/pegasus/src/proposals/core-proposal.js',
    getManifestCall: [
      'getManifestForPegasus',
      {
        pegasusRef: publishRef(
          install(
            '@agoric/pegasus/src/contract.js',
            '../bundles/bundle-pegasus.js',
          ),
        ),
      },
    ],
  });

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('gov-pegasus', defaultProposalBuilder);
};
