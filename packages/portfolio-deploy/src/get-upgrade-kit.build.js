/**
 * @import { CoreEvalBuilder, DeployScriptFunction } from '@agoric/deploy-script-support/src/externalTypes.js';
 */

import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForGetUpgradeKit } from './get-upgrade-kit.core.js';

const sourceSpec = './get-upgrade-kit.core.js';

/**
 * @satisfies {CoreEvalBuilder}
 */
const defaultProposalBuilder = async () => {
  return harden({
    sourceSpec,
    getManifestCall: [getManifestForGetUpgradeKit.name],
  });
};

/** @type {DeployScriptFunction} */
const build = async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  await writeCoreEval('eval-get-upgrade-kit', () => defaultProposalBuilder());
};

export default build;
