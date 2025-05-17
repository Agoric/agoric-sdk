/**
 * Usage:
 * agoric run fast-usdc-evm-dests.build.js
 *
 * (see upgrade-evm-dests.core.js)
 */
import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForUpgradeEvmDests } from './upgrade-evm-dests.core.js';

/**
 * @import {CoreEvalBuilder, DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/**
 * @param {Parameters<CoreEvalBuilder>[0]} powers
 * @param {{}} options
 * @satisfies {CoreEvalBuilder}
 */
export const proposalBuilder = async (
  { publishRef, install },
  options = {},
) => {
  return harden({
    sourceSpec: './upgrade-evm-dests.core.js',
    /** @type {[string, Parameters<typeof getManifestForUpgradeEvmDests>[1]]} */
    getManifestCall: [
      getManifestForUpgradeEvmDests.name,
      {
        options,
        installKeys: {
          fastUsdc: publishRef(
            install(
              '@aglocal/fast-usdc-deploy/dist/fast-usdc.contract.bundle.js',
            ),
          ),
        },
      },
    ],
  });
};

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  await writeCoreEval('eval-fast-usdc-evm-dests', utils =>
    proposalBuilder(utils),
  );
};
