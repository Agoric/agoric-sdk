/**
 * Usage:
 * agoric run fast-usdc-evm-solana.build.js
 *
 * (see upgrade-evm-solana.core.js)
 */
import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForUpgradeEvmSolana } from './upgrade-evm-solana.core.js';

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
    sourceSpec: './upgrade-evm-solana.core.js',
    /** @type {[string, Parameters<typeof getManifestForUpgradeEvmSolana>[1]]} */
    getManifestCall: [
      getManifestForUpgradeEvmSolana.name,
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

  await writeCoreEval('eval-fast-usdc-evm-solana', utils =>
    proposalBuilder(utils),
  );
};
