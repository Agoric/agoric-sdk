import { makeHelpers } from '@agoric/deploy-script-support';
import { parseArgs } from 'node:util';
import {
  axelarConfigTestnet,
  axelarConfig as axelarMainnetConfig,
} from './axelar-configs.js';
import { toExternalConfig } from './config-marshal.js';
import { name } from './portfolio.contract.permit.js';

/**
 * @import {CopyRecord} from '@endo/pass-style';
 * @import { CoreEvalBuilder, DeployScriptFunction } from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {ParseArgsConfig} from 'node:util';
 */

/** @type {ParseArgsConfig['options'] } */
const options = {
  net: { type: 'string' },
};

/**
 * @param {Parameters<CoreEvalBuilder>[0]} tools
 * @param {import('./axelar-configs.js').AxelarChainConfigMap} axelarConfig
 * @param {CopyRecord} [config]
 * @satisfies {CoreEvalBuilder}
 */
const defaultProposalBuilder = async (
  { publishRef, install },
  axelarConfig,
  config = harden({}),
) => {
  return harden({
    sourceSpec: './portfolio-start.core.js',
    getManifestCall: [
      'getManifestForPortfolio', // TODO: unit test agreemnt with getManifestForPortfolio.name
      {
        options: { config: toExternalConfig(config, {}), axelarConfig },
        installKeys: {
          [name]: publishRef(install('../dist/portfolio.contract.bundle.js')),
        },
      },
    ],
  });
};

/**
 * @typedef {{
 *   baseName: string;
 *   chainInfo: string;
 *   net?: string;
 *   peer?: string[];
 * }} FlagValues
 */
/** @type {DeployScriptFunction} */ 0;
const build = async (homeP, endowments) => {
  const { scriptArgs } = endowments;
  /** @type {FlagValues} */
  // @ts-expect-error guaranteed by options config
  const { values: flags } = parseArgs({ args: scriptArgs, options });
  const isMainnet = flags.net === 'mainnet';
  const axelarConfig = isMainnet
    ? harden({ ...axelarMainnetConfig })
    : harden({ ...axelarConfigTestnet });

  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  // TODO: unit test agreement with startPortfolio.name
  await writeCoreEval('eval-ymax0', utils =>
    defaultProposalBuilder(utils, axelarConfig),
  );
};

export default build;
