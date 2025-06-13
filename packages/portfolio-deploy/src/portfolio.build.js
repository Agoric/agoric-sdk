import { makeHelpers } from '@agoric/deploy-script-support';
import { toExternalConfig } from './config-marshal.js';
import { name } from './portfolio.contract.permit.js';

/**
 * @import {CopyRecord} from '@endo/pass-style';
 * @import { CoreEvalBuilder, DeployScriptFunction } from '@agoric/deploy-script-support/src/externalTypes.js';
 */

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
    sourceSpec: './portfolio-start.core.js',
    getManifestCall: [
      'getManifestForPortfolio', // TODO: unit test agreemnt with getManifestForPortfolio.name
      {
        options: toExternalConfig(config, {}),
        installKeys: {
          [name]: publishRef(install('../dist/portfolio.contract.bundle.js')),
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
