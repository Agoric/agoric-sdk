import { makeHelpers } from '@agoric/deploy-script-support';
import { FeedPolicyShape } from '@agoric/fast-usdc/src/type-guards.js';
import { parseArgs } from 'node:util';
import { getManifestForUpdateFastUsdcPolicy } from './fast-usdc-policy.core.js';
import { ChainPolicies } from './utils/chain-policies.js';
import { toExternalConfig } from './utils/config-marshal.js';

/**
 * @import {CoreEvalBuilder, DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js'
 * @import {ParseArgsConfig} from 'node:util'
 * @import {FastUSDCConfig} from '@agoric/fast-usdc';
 */

/** @type {ParseArgsConfig['options']} */
const options = {
  feedPolicy: { type: 'string' },
  network: { type: 'string' },
};
const feedPolicyUsage =
  'use --feedPolicy <JSON>, optionally with --network <MAINNET|TESTNET> for chainPolicies';

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
    values: { feedPolicy: feedPolicyJSON, network },
  } = parseArgs({ args: endowments.scriptArgs, options });

  if (typeof feedPolicyJSON !== 'string') throw Error(feedPolicyUsage);
  const feedPolicy = JSON.parse(feedPolicyJSON);
  if (network !== undefined) {
    if (!Object.hasOwn(ChainPolicies, network)) {
      const q = JSON.stringify;
      throw Error(
        `network name ${q(network)} not in ${q(Reflect.ownKeys(ChainPolicies))}`,
      );
    }
    if (feedPolicy.chainPolicies) throw Error('cannot merge chainPolicies');
    feedPolicy.chainPolicies = ChainPolicies[network];
  }
  const config = harden({ feedPolicy });
  await writeCoreEval('eval-fast-usdc-policy-update', utils =>
    updateProposalBuilder(utils, config),
  );
};
