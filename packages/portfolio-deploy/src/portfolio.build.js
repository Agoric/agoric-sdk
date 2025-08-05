// import { AxelarConfigShape } from '@aglocal/portfolio-contract/src/portfolio.contract.js';
import { makeHelpers } from '@agoric/deploy-script-support';
import { parseArgs } from 'node:util';
import {
  axelarConfigTestnet,
  axelarConfig as axelarMainnetConfig,
  gmpAddresses,
} from './axelar-configs.js';
import { toExternalConfig } from './config-marshal.js';
import { name } from './portfolio.contract.permit.js';
import { portfolioDeployConfigShape } from './portfolio-start.core.js';

/**
 * @import { CoreEvalBuilder, DeployScriptFunction } from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {ParseArgsConfig} from 'node:util';
 * @import {PortfolioDeployConfig} from './portfolio-start.core.js';
 */

const isValidAddr = addr => {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
};

/** @type {ParseArgsConfig['options'] } */
const options = {
  net: { type: 'string' },
  replace: { type: 'string' },
};

/**
 * @param {Parameters<CoreEvalBuilder>[0]} tools
 * @param {PortfolioDeployConfig} config
 * @satisfies {CoreEvalBuilder}
 */
const defaultProposalBuilder = async ({ publishRef, install }, config) => {
  return harden({
    sourceSpec: './portfolio-start.core.js',
    getManifestCall: [
      'getManifestForPortfolio', // TODO: unit test agreemnt with getManifestForPortfolio.name
      {
        options: toExternalConfig(config, {}, portfolioDeployConfigShape),
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
 *   replace?: string;
 * }} FlagValues
 */
/** @type {DeployScriptFunction} */ 0;
const build = async (homeP, endowments) => {
  const { scriptArgs } = endowments;
  /** @type {FlagValues} */
  // @ts-expect-error guaranteed by options config
  const { values: flags } = parseArgs({ args: scriptArgs, options });
  const boardId = flags.replace;

  /** @type {{ mainnet: PortfolioDeployConfig, testnet: PortfolioDeployConfig }} */
  const configs = harden({
    mainnet: {
      axelarConfig: { ...axelarMainnetConfig },
      gmpAddresses: {
        ...gmpAddresses.mainnet,
      },
      oldBoardId: boardId || '',
    },
    testnet: {
      axelarConfig: { ...axelarConfigTestnet },
      gmpAddresses: {
        ...gmpAddresses.testnet,
      },
      oldBoardId: boardId || '',
    },
  });

  const isMainnet = flags.net === 'devnet';
  const config = configs[isMainnet ? 'mainnet' : 'testnet'];

  if (isMainnet) {
    for (const [chain, chainConfig] of Object.entries(config.axelarConfig)) {
      const addr = chainConfig.contracts.factory;

      if (!addr || !isValidAddr(addr)) {
        throw new Error(`Invalid address for ${chain}: ${addr}`);
      }
    }
  }

  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  // TODO: unit test agreement with startPortfolio.name
  await writeCoreEval('eval-ymax0', utils =>
    defaultProposalBuilder(utils, harden(config)),
  );
};

export default build;
