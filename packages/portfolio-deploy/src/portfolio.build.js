import { makeHelpers } from '@agoric/deploy-script-support';
import { toExternalConfig } from './config-marshal.js';

/**
 * @import {CopyRecord} from '@endo/pass-style';
 * @import { CoreEvalBuilder, DeployScriptFunction } from '@agoric/deploy-script-support/src/externalTypes.js';
 */

// XXX copied from portfolio.contract.meta.ts
const meta = { name: 'ymax0' };

/**
 * @param {Parameters<CoreEvalBuilder>[0]} tools
 * @param {CopyRecord} [config]
 * @satisfies {CoreEvalBuilder}
 */
const defaultProposalBuilder = async (
  { publishRef, install },
  config = harden({}),
) => {
  return harden({
    // XXX: using .ts for the core script introduces a build step
    // that multichain-testing doesn't always do when it's needed.
    // TODO: eliminate build step by moving to .js? or something
    sourceSpec: '../dist/portfolio-start.core.bundle.js',
    getManifestCall: [
      'getManifestForPortfolio', // TODO: unit test agreemnt with getManifestForPortfolio.name
      {
        options: toExternalConfig(config, {}),
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
