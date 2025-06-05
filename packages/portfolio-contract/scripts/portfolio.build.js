import { makeHelpers } from '@agoric/deploy-script-support';
import { parseArgs } from 'node:util';
import { M } from '@endo/patterns';
import {
  ChainInfoShape,
  DenomDetailShape,
  DenomShape,
} from '@agoric/orchestration';
import { toExternalConfig } from '../src/config-marshal.js';

// TODO: import { PortfolioConfigShape } from '../src/type-guards.js';
const PortfolioConfigShape = M.splitRecord({
  chainInfo: M.recordOf(M.string(), ChainInfoShape),
  assetInfo: M.arrayOf([DenomShape, DenomDetailShape]),
});

/**
 * @import {ParseArgsConfig} from 'node:util'
 * @import {PortfolioConfig} from '../src/type-guards.js';
 * @import { CoreEvalBuilder, DeployScriptFunction } from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/** @type {ParseArgsConfig['options']} */
const options = {
  chainInfo: { type: 'string' },
  assetInfo: { type: 'string' },
};

/**
 * @typedef {{
 *   chainInfo?: string;
 *   assetInfo?: string;
 * }} PortfolioOpts
 */

const DBG = (label, x) => {
  console.log(label, x);
  return x;
};

// XXX copied from portfolio.contract.meta.ts
const meta = { name: 'ymax0' };

const crossVatContext = /** @type {const} */ ({});

/**
 * @param {Parameters<CoreEvalBuilder>[0]} tools
 * @param {PortfolioConfig} config
 * @satisfies {CoreEvalBuilder}
 */
const defaultProposalBuilder = async ({ publishRef, install }, config) => {
  return DBG(
    '@@@defaultProposalBuilder returns',
    harden({
      // XXX: using .ts for the core script introduces a build step
      // that multichain-testing doesn't always do when it's needed.
      // TODO: eliminate build step by moving to .js? or something
      sourceSpec: '../dist/portfolio-start.core.bundle.js',
      getManifestCall: [
        'getManifestForPortfolio', // TODO: unit test agreemnt with getManifestForPortfolio.name
        {
          options: toExternalConfig(
            config,
            crossVatContext,
            PortfolioConfigShape,
          ),

          installKeys: {
            [meta.name]: publishRef(
              install('../dist/portfolio.contract.bundle.js'),
            ),
          },
        },
      ],
    }),
  );
};

/** @type {DeployScriptFunction} */ 0;
const build = async (homeP, endowments) => {
  const { scriptArgs } = endowments;

  /** @type {{ values: PortfolioOpts }} */
  const {
    values: { chainInfo, assetInfo },
  } = parseArgs({ args: scriptArgs, options });

  const parseChainInfo = () => {
    if (!chainInfo) return {};
    return JSON.parse(chainInfo);
  };
  const parseAssetInfo = () => {
    if (!assetInfo) return [];
    return JSON.parse(assetInfo);
  };

  /** @type {PortfolioConfig} */
  const config = harden({
    chainInfo: parseChainInfo(),
    assetInfo: parseAssetInfo(),
  });
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  // TODO: unit test agreement with startPortfolio.name
  await writeCoreEval('startPortfolio', utils =>
    defaultProposalBuilder(utils, config),
  );
};

export default build;
