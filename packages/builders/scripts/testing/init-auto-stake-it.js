/**
 * @file A proposal to start the auto-stake-it contract.
 *
 *   AutoStakeIt allows users to to create an auto-forwarding address that
 *   transfers and stakes tokens on a remote chain when received.
 */
import { makeHelpers } from '@agoric/deploy-script-support';
import { startAutoStakeIt } from '@agoric/orchestration/src/proposals/start-auto-stake-it.js';
import { parseChainHubOpts } from '../orchestration/helpers.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async (
  { publishRef, install },
  options,
) => {
  return harden({
    sourceSpec: '@agoric/orchestration/src/proposals/start-auto-stake-it.js',
    getManifestCall: [
      'getManifest',
      {
        installKeys: {
          autoAutoStakeIt: publishRef(
            install(
              '@agoric/orchestration/src/examples/auto-stake-it.contract.js',
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
  await writeCoreEval(startAutoStakeIt.name, utils =>
    defaultProposalBuilder(utils, opts),
  );
};
