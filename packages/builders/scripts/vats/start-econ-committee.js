import { makeHelpers } from '@agoric/deploy-script-support';

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/**
 * Start the Economic Committee electorate plus the governance installations
 * (contractGovernor, committee, binaryVoteCounter) that governed contracts such
 * as provisionPool depend on. Formerly part of
 * `@agoric/builders/scripts/inter-protocol/init-core.js`; the behavior now
 * lives in `@agoric/vats` and the contracts in `@agoric/governance`.
 *
 * @type {CoreEvalBuilder}
 */
export const defaultProposalBuilder = async (
  { publishRef, install },
  options = {},
) => {
  const { econCommitteeOptions } = options;
  return harden({
    sourceSpec: '@agoric/vats/src/proposals/start-econ-committee.js',
    getManifestCall: [
      'getManifestForEconCommittee',
      {
        econCommitteeOptions,
        installKeys: {
          contractGovernor: publishRef(
            install('@agoric/governance/src/contractGovernor.js'),
          ),
          committee: publishRef(install('@agoric/governance/src/committee.js')),
          binaryVoteCounter: publishRef(
            install('@agoric/governance/src/binaryVoteCounter.js'),
          ),
        },
      },
    ],
  });
};

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('gov-econ-committee', defaultProposalBuilder);
};
