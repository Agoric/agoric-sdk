// @ts-check
import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForQuickSend } from '@agoric/orchestration/src/proposals/start-quickSend.js';

/** @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js'; */

/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    sourceSpec: '@agoric/orchestration/src/proposals/start-quickSend.js',
    getManifestCall: [
      getManifestForQuickSend.name,
      {
        installKeys: {
          quickSend: publishRef(
            install('@agoric/orchestration/src/examples/quickSend.contract.js'),
          ),
        },
      },
    ],
  });

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('start-quickSend', defaultProposalBuilder);
};
