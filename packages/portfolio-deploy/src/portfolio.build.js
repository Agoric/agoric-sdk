import { makeHelpers } from '@agoric/deploy-script-support';
import { M } from '@endo/patterns';
import { toExternalConfig } from './config-marshal.js';

// TODO: import { PortfolioConfigShape } from '../src/type-guards.js';
const PortfolioConfigShape = M.splitRecord({});

/**
 * @import {PortfolioConfig} from '@aglocal/portfolio-contract/src/type-guards.js';
 * @import { CoreEvalBuilder, DeployScriptFunction } from '@agoric/deploy-script-support/src/externalTypes.js';
 */

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
 * @param {PortfolioConfig} [config]
 * @satisfies {CoreEvalBuilder}
 */
const defaultProposalBuilder = async ({ publishRef, install }, config = {}) => {
  return harden({
    // XXX: using .ts for the core script introduces a build step
    // that multichain-testing doesn't always do when it's needed.
    // TODO: eliminate build step by moving to .js? or something
    sourceSpec: '../dist/portfolio-start.core.bundle.js',
    getManifestCall: [
      'getManifestForPortfolio', // TODO: unit test agreemnt with getManifestForPortfolio.name
      {
        options: DBG(
          '@@@config',
          toExternalConfig(
            harden(config),
            crossVatContext,
            PortfolioConfigShape,
          ),
        ),

        installKeys: {
          [meta.name]: publishRef(
            install('../dist/portfolio.contract.bundle.js'),
          ),
        },
      },
    ],
  });
};

/** @type {DeployScriptFunction} */ 0;
const build = async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  // TODO: unit test agreement with startPortfolio.name
  await writeCoreEval('startPortfolio', defaultProposalBuilder);
};

export default build;
