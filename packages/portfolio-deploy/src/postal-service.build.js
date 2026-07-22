/**
 * @import { CoreEvalBuilder, DeployScriptFunction } from '@agoric/deploy-script-support/src/externalTypes.js';
 */

import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForPostalService } from '@agoric/deploy-script-support/src/control/postal-service.core.js';

const sourceSpec =
  '@agoric/deploy-script-support/src/control/postal-service.core.js';

/**
 * @param {Parameters<CoreEvalBuilder>[0]} tools
 * @satisfies {CoreEvalBuilder}
 */
const defaultProposalBuilder = async ({ publishRef, install }) => {
  return harden({
    sourceSpec,
    getManifestCall: [
      getManifestForPostalService.name,
      {
        installKeys: {
          postalService: publishRef(
            install('./control/postal-service.contract.js'),
          ),
        },
      },
    ],
  });
};

/** @type {DeployScriptFunction} */
const build = async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  await writeCoreEval('eval-postal-service', utils =>
    defaultProposalBuilder(utils),
  );
};

export default build;
