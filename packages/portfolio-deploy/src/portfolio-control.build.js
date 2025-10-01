/**
 * @import { CoreEvalBuilder, DeployScriptFunction } from '@agoric/deploy-script-support/src/externalTypes.js';
 */

import { makeHelpers } from '@agoric/deploy-script-support';
import { parseArgs } from 'util';
import {
  getManifestForPortfolioControl,
  isYMaxContractName,
} from './portfolio-control.core.js';

/**
 * @import { DelegatePortfolioOptions } from './portfolio-control.core.js';
 */

const sourceSpec = './portfolio-control.core.js';

/**
 * @param {Parameters<CoreEvalBuilder>[0]} tools
 * @param {DelegatePortfolioOptions} config
 * @satisfies {CoreEvalBuilder}
 */
const defaultProposalBuilder = async (tools, config) => {
  return harden({
    sourceSpec,
    getManifestCall: [
      getManifestForPortfolioControl.name,
      {
        options: config,
      },
    ],
  });
};

/** @type {DeployScriptFunction} */
const build = async (homeP, endowments) => {
  const { scriptArgs } = endowments;
  const {
    values: { ymaxControlAddress, contractName },
  } = parseArgs({
    args: scriptArgs,
    options: {
      ymaxControlAddress: { type: 'string' },
      contractName: { type: 'string', default: 'ymax0' },
    },
  });
  if (!ymaxControlAddress || !isYMaxContractName(contractName)) {
    throw Error(
      'Usage: agoric run _script_ --ymaxControlAddress=agoric1... --contractName=ymaxN',
    );
  }
  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  const config = { ymaxControlAddress, contractName };
  await writeCoreEval('eval-ymax-control', utils =>
    defaultProposalBuilder(utils, harden(config)),
  );
};

export default build;
