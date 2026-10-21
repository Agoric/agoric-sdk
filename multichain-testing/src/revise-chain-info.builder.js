/* global harden */
/// <reference types="ses" />
import { makeHelpers } from '@agoric/deploy-script-support';

import chainInfo from '../starship-chain-info.js';

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async () =>
  harden({
    sourceSpec: '@agoric/orchestration/src/proposals/revise-chain-info.js',
    getManifestCall: [
      'getManifestForReviseChains',
      {
        chainInfo,
      },
    ],
  });

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('eval-revise-chain-info', defaultProposalBuilder);
};
