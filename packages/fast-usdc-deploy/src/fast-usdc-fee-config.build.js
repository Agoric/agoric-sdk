/**
 * Usage:
 * agoric run fast-usdc-fee-config.build.js
 *
 * see {@link fast-usdc-contract/src/update-fee-config.core.js}
 */
import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForUpdateFeeConfig } from './update-fee-config.core.js';

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
    sourceSpec: './update-fee-config.core.js',
    /** @type {[string, Parameters<typeof getManifestForUpdateFeeConfig>[1]]} */
    getManifestCall: [
      getManifestForUpdateFeeConfig.name,
      {
        options,
        installKeys: {
          fastUsdc: publishRef(
            install('@aglocal/fast-usdc-contract/src/fast-usdc.contract.js'),
          ),
        },
      },
    ],
  });
};

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  await writeCoreEval('eval-fast-usdc-fee-config', utils =>
    proposalBuilder(utils),
  );
};
