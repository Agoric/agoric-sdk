import { makeHelpers } from '@agoric/deploy-script-support';
import { FeedPolicyShape } from '@agoric/fast-usdc/src/type-guards.js';
import { parseArgs } from 'node:util';
import { getManifestForUpdateFastUsdcPolicy } from './fast-usdc-policy.core.js';
import { toExternalConfig } from './utils/config-marshal.js';

/**
 * @import {CoreEvalBuilder, DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js'
 * @import {ParseArgsConfig} from 'node:util'
 * @import {FastUSDCConfig} from '@agoric/fast-usdc';
 */

/** @type {ParseArgsConfig['options']} */
const options = {
  feedPolicy: { type: 'string' },
};
const feedPolicyUsage = 'use --feedPolicy <policy> ...';

/**
 * @typedef {{
 *   feedPolicy?: string;
 * }} FastUSDCUpdateOpts
 */

/**
 * @param {Parameters<CoreEvalBuilder>[0]} powers
 * @param {FastUSDCConfig} config
 * @satisfies {CoreEvalBuilder}
 */
export const updateProposalBuilder = async (
  powers,
  /** @type {Pick<FastUSDCConfig, 'feedPolicy'>} */ config,
) => {
  return harden({
    sourceSpec: './fast-usdc-policy.core.js',
    /** @type {[string, Parameters<typeof getManifestForUpdateFastUsdcPolicy>[1]]} */
    getManifestCall: [
      getManifestForUpdateFastUsdcPolicy.name,
      {
        options: toExternalConfig(
          config,
          {},
          harden({ feedPolicy: FeedPolicyShape }),
        ),
      },
    ],
  });
};

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  const {
    values: { feedPolicy },
  } = parseArgs({ args: endowments.scriptArgs, options });

  const parseFeedPolicy = () => {
    if (typeof feedPolicy !== 'string') throw Error(feedPolicyUsage);
    return JSON.parse(feedPolicy);
  };
  const config = harden({ feedPolicy: parseFeedPolicy() });
  await writeCoreEval('eval-fast-usdc-policy-update', utils =>
    updateProposalBuilder(utils, config),
  );
};
