/**
 * @import { CoreEvalBuilder, DeployScriptFunction } from '@agoric/deploy-script-support/src/externalTypes.js';
 */

import { makeHelpers } from '@agoric/deploy-script-support';
import { parseArgs } from 'util';
import { getManifestForPortfolioControl } from './portfolio-control.core.js';

const sourceSpec = './portfolio-control.core.js';

/**
 * @param {Parameters<CoreEvalBuilder>[0]} tools
 * @param {{ymaxControlAddress: string}} config
 * @satisfies {CoreEvalBuilder}
 */
const defaultProposalBuilder = async ({ publishRef, install }, config) => {
  return harden({
    sourceSpec,
    getManifestCall: [
      getManifestForPortfolioControl.name,
      {
        options: config,
        installKeys: {
          postalService: publishRef(install('./postal-service.contract.js')),
        },
      },
    ],
  });
};

/** @type {DeployScriptFunction} */
const build = async (homeP, endowments) => {
  const { scriptArgs } = endowments;
  const {
    values: { ymaxControlAddress },
  } = parseArgs({
    args: scriptArgs,
    options: {
      ymaxControlAddress: { type: 'string' },
    },
  });
  if (!ymaxControlAddress) {
    throw Error('Usage: agoric run _script_ --ymaxControlAddress=agoric1...');
  }
  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  const config = { ymaxControlAddress };
  await writeCoreEval('eval-ymax-control', utils =>
    defaultProposalBuilder(utils, harden(config)),
  );
};

export default build;
