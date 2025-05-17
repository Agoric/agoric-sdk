import { makeHelpers } from '@agoric/deploy-script-support';
import { startBasicFlows } from '@agoric/orchestration/src/proposals/start-basic-flows.js';
import { parseChainHubOpts } from './helpers.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
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

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { scriptArgs } = endowments;
  const opts = parseChainHubOpts(scriptArgs);
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(startBasicFlows.name, utils =>
    defaultProposalBuilder(utils, opts),
  );
};
