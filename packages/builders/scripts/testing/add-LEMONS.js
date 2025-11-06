import { makeHelpers } from '@agoric/deploy-script-support';
import { defaultProposalBuilder as vaultProposalBuilder } from '../inter-protocol/add-collateral-core.js';

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/** @file This is for use in tests in a3p-integration */

/** @type {CoreEvalBuilder} */
const starsVaultProposalBuilder = async powers => {
  return vaultProposalBuilder(powers, {
    interchainAssetOptions: {
      denom: 'ibc/000C0FFEECAFE000',
      decimalPlaces: 6,
      keyword: 'LEMONS',

      oracleBrand: 'LEMONS',
      proposedName: 'LEMONS',
    },
  });
};

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('add-STARS-collateral', starsVaultProposalBuilder);
};
