/**
 * @import { CoreEvalBuilder, DeployScriptFunction } from '@agoric/deploy-script-support/src/externalTypes.js';
 */

import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForAttenuatedDeposit } from '@agoric/deploy-script-support/src/control/attenuated-deposit.core.js';

const sourceSpec =
  '@agoric/deploy-script-support/src/control/attenuated-deposit.core.js';

/**
 * @satisfies {CoreEvalBuilder}
 */
const defaultProposalBuilder = async () => {
  return harden({
    sourceSpec,
    getManifestCall: [getManifestForAttenuatedDeposit.name],
  });
};

/** @type {DeployScriptFunction} */
const build = async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  await writeCoreEval('eval-attenuated-deposit', () =>
    defaultProposalBuilder(),
  );
};

export default build;
