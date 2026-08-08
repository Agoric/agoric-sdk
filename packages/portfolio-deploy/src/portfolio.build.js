/* global globalThis */
// import { AxelarConfigShape } from '@aglocal/portfolio-contract/src/portfolio.contract.js';
import { makeHelpers } from '@agoric/deploy-script-support';
import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  axelarConfigTestnet,
  axelarConfig as axelarMainnetConfig,
  gmpAddresses,
} from './axelar-configs.js';
import { toExternalConfig } from './config-marshal.js';
import { name } from './portfolio.contract.permit.js';
import { portfolioDeployConfigShape } from './portfolio-start.core.js';
import {
  getDefaultChainMetadata,
  getDefaultPoolMetadata,
  updateConfigFromYds,
} from './token-meta.js';

const nodeRequire = createRequire(import.meta.url);
const asset = spec => readFile(nodeRequire.resolve(spec), 'utf8');

/**
 * @import { CoreEvalBuilder, DeployScriptFunction } from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {PortfolioDeployConfig} from './portfolio-start.core.js';
 */

const isValidAddr = addr => {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
};

const helpText = (progname) => `Usage: agoric run ${progname} [options]

Build a ymax0 portfolio contract core-eval proposal.

The script installs the portfolio contract bundle, prepares private args for
the selected network, and writes the core-eval artifact used to start or
replace the ymax0 portfolio contract. By default it targets testnet-style
configuration. Pass --net=mainnet for mainnet addresses, or --yds with a
main*.ymax.app URL to select mainnet automatically.

Options:
  -h, --help              Show this help text and exit.
      --net <network>     Deployment network: "testnet" (default) or
                          "mainnet".
      --replace <boardId> Board ID of an existing ymax0 instance to replace.
      --no-flow-config    Omit the default flow configuration from private
                          args.
      --yds <url>         Fetch YDS metadata from <url> and use it to configure
                          reward tokens by pool and stable tokens by chain.

Examples:
  agoric run ${progname} --net testnet
  agoric run ${progname} --net mainnet --replace BOARD_ID
  agoric run ${progname} --yds https://main0.ymax.app
`;
harden(helpText);

const parseBuilderArgs = args =>
  parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      net: { type: 'string' },
      replace: { type: 'string' },
      'no-flow-config': { type: 'boolean', default: false },
      yds: { type: 'string' },
    },
  });

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

/** @type {DeployScriptFunction} */ 0;
const build = async (homeP, endowments) => {
  const filename = fileURLToPath(import.meta.url);
  const progname = path.relative(process.cwd(), filename);

  await null;
  const {
    scriptArgs,
    fetch = globalThis.fetch,
    console: ioConsole = console,
  } = endowments;
  const { values: flags } = parseBuilderArgs(scriptArgs);
  if (flags.help) {
    ioConsole.log(helpText(progname).trimEnd());
    return;
  }
  const boardId = flags.replace;
  const defaultFlowConfig = flags['no-flow-config'] ? null : undefined;
  const yds = flags.yds;

  const { bytecode: walletBytecode } = JSON.parse(
    await asset('@aglocal/portfolio-deploy/tools/evm-orch/Wallet.json'),
  );

  /**
   * @type {Record<string, PortfolioDeployConfig>}
   */
  const configs = harden({
    mainnet: {
      cluster: 'mainnet',
      axelarConfig: { ...axelarMainnetConfig },
      gmpAddresses: {
        ...gmpAddresses.mainnet,
      },
      oldBoardId: boardId || '',
      walletBytecode,
      poolMetadata: getDefaultPoolMetadata(),
      chainMetadata: getDefaultChainMetadata('mainnet'),
      defaultFlowConfig,
    },
    testnet: {
      cluster: 'testnet',
      axelarConfig: { ...axelarConfigTestnet },
      gmpAddresses: {
        ...gmpAddresses.testnet,
      },
      oldBoardId: boardId || '',
      walletBytecode,
      poolMetadata: getDefaultPoolMetadata(),
      chainMetadata: getDefaultChainMetadata('testnet'),
      defaultFlowConfig,
    },
  });

  if (flags.net == null && yds != null) {
    if (/^https:\/\/(main\d+\.)?ymax\.app\b([^.]|$)/.test(yds)) {
      console.info(`Auto-selecting \`--net=mainnet\` due to \`--yds=${yds}\``);
      flags.net = 'mainnet';
    }
  }
  const isMainnet = flags.net === 'mainnet';
  let config = configs[isMainnet ? 'mainnet' : 'testnet'];

  if (yds !== undefined) {
    config = await updateConfigFromYds({ config, yds, fetch });
  }

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
