import { makeHelpers } from '@agoric/deploy-script-support';
import { parseChainHubOpts } from './helpers.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async (
  { publishRef, install },
  options,
) => {
  return harden({
    sourceSpec: '@agoric/orchestration/src/proposals/start-stakeAtom.js',
    getManifestCall: [
      'getManifestForStakeAtom',
      {
        installKeys: {
          stakeIca: publishRef(
            install('@agoric/orchestration/src/examples/stake-ica.contract.js'),
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
  await writeCoreEval('start-stakeAtom', utils =>
    defaultProposalBuilder(utils, opts),
  );
};
