import { makeHelpers } from '@agoric/deploy-script-support';

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async _powers =>
  harden({
    sourceSpec: '@agoric/vats/src/proposals/vtransfer-echoer.js',
    getManifestCall: [
      'getManifestForVtransferEchoer',
      {
        target: 'agoric1vtransfertest',
      },
    ],
  });

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('test-vtransfer', defaultProposalBuilder);
};
