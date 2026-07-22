import { makeHelpers } from '@agoric/deploy-script-support';

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec:
      '@agoric/vats/src/proposals/upgrade-provisionPool-to-BLD-proposal.js',
    getManifestCall: [
      'getManifestForUpgradingProvisionPool',
      {
        provisionPoolRef: publishRef(
          install('@agoric/vats/src/provisionPool.js'),
        ),
      },
    ],
  });

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal(
    'upgrade-provision-pool-to-BLD',
    defaultProposalBuilder,
  );
};
