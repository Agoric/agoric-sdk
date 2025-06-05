import { makeHelpers } from '@agoric/deploy-script-support';

/**
 * @import { CoreEvalBuilder, DeployScriptFunction } from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/**
 * @param {Parameters<CoreEvalBuilder>[0]} tools
 * @param {unknown} options
 * @satisfies {CoreEvalBuilder}
 */
const defaultProposalBuilder = async ({ publishRef, install }, options) => {
  return harden({
    sourceSpec: '../dist/portfolio-start.core.bundle.js',
    getManifestCall: [
      'getManifestForPortfolio', // TODO: unit test agreemnt with getManifestForPortfolio.name
      {
        installKeys: {
          queryFlows: publishRef(
            install('../dist/portfolio.contract.bundle.js'),
          ),
        },
        options,
      },
    ],
  });
};

/** @type {DeployScriptFunction} */ 0;
const build = async (homeP, endowments) => {
  // TODO: const { scriptArgs } = endowments;
  const opts = {};
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  // TODO: unit test agreement with startPortfolio.name
  await writeCoreEval('startPortfolio', utils =>
    defaultProposalBuilder(utils, opts),
  );
};

export default build;
