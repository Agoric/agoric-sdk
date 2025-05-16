// @ts-check
import { makeHelpers } from '@agoric/deploy-script-support';
import { Far } from '@endo/far';
import { getManifestForAddOperators } from './add-operators.core.js';
import { toExternalConfig } from './utils/config-marshal.js';
import { parseOracleArgs } from './utils/oracles-args.js';

/**
 * @import {CoreEvalBuilder, DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {Brand} from '@agoric/ertp';
 * @import {FastUSDCConfig, FeedPolicy} from '@agoric/fast-usdc';
 */

const crossVatContext = /** @type {const} */ ({
  /** @type {Brand<'nat'>} */
  USDC: Far('USDC Brand'),
});

/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async (
  powers,
  /** @type {FastUSDCConfig} */ config,
) => {
  return harden({
    sourceSpec: './add-operators.core.js',
    /** @type {[string, Parameters<typeof getManifestForAddOperators>[1]]} */
    getManifestCall: [
      getManifestForAddOperators.name,
      {
        options: toExternalConfig(config, crossVatContext),
      },
    ],
  });
};

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  const { scriptArgs } = endowments;

  const config = harden({
    oracles: parseOracleArgs(scriptArgs),
  });

  await writeCoreEval('add-operators', utils =>
    defaultProposalBuilder(utils, config),
  );
};
