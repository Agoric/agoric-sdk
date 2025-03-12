/* global harden */
/// <reference types="ses" />
import { makeHelpers } from '@agoric/deploy-script-support';

import chainInfo from '../starship-chain-info.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
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

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('eval-revise-chain-info', defaultProposalBuilder);
};
