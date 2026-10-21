import { makeHelpers } from '@agoric/deploy-script-support';
import { startBasicFlows } from '@agoric/orchestration/src/proposals/start-basic-flows.js';
import { parseChainHubOpts } from './helpers.js';

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async (
  { publishRef, install },
  options,
) => {
  return harden({
    sourceSpec: '@agoric/orchestration/src/proposals/start-basic-flows.js',
    getManifestCall: [
      'getManifestForContract',
      {
        installKeys: {
          basicFlows: publishRef(
            install(
              '@agoric/orchestration/src/examples/basic-flows.contract.js',
            ),
          ),
        },
        options,
      },
    ],
  });
};

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { scriptArgs } = endowments;
  const opts = parseChainHubOpts(scriptArgs);
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(startBasicFlows.name, utils =>
    defaultProposalBuilder(utils, opts),
  );
};
