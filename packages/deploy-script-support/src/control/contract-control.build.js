/**
 * @import { CoreEvalBuilder, DeployScriptFunction } from '@agoric/deploy-script-support/src/externalTypes.js';
 */

import { makeHelpers } from '../helpers.js';
import { getManifestForDeliverContractControl } from './contract-control.core.js';

const sourceSpec = './contract-control.core.js';

/**
 * @satisfies {CoreEvalBuilder}
 */
const defaultProposalBuilder = async () => {
  return harden({
    sourceSpec,
    getManifestCall: [getManifestForDeliverContractControl.name],
  });
};

/** @type {DeployScriptFunction} */
const build = async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  await writeCoreEval('eval-contract-control', () => defaultProposalBuilder());
};
harden(build);
export default build;
