// @ts-check
import { makeHelpers } from '@agoric/deploy-script-support';

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '@agoric/orchestration/src/proposals/start-stakeBld.js',
    getManifestCall: [
      'getManifestForStakeBld',
      {
        installKeys: {
          stakeBld: publishRef(
            install('@agoric/orchestration/src/examples/stake-bld.contract.js'),
          ),
        },
      },
    ],
  });

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('start-stakeBld', defaultProposalBuilder);
};
