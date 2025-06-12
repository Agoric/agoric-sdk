import { makeHelpers } from '@agoric/deploy-script-support';
import {
  getManifest,
  startSwapAnything,
} from '@agoric/orchestration/src/proposals/start-swap-anything.js';
import { parseChainHubOpts } from '../orchestration/helpers.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async (
  { publishRef, install },
  options,
) =>
  harden({
    sourceSpec: '@agoric/orchestration/src/proposals/start-swap-anything.js',
    getManifestCall: [
      getManifest.name,
      {
        installationRef: publishRef(
          install(
            '@agoric/orchestration/src/examples/swap-anything.contract.js',
          ),
        ),
        options,
      },
    ],
  });

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { scriptArgs } = endowments;
  const opts = parseChainHubOpts(scriptArgs);
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(startSwapAnything.name, utils =>
    defaultProposalBuilder(utils, opts),
  );
};
