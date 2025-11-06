import { makeHelpers } from '@agoric/deploy-script-support';
import { defaultProposalBuilder as vaultProposalBuilder } from '../inter-protocol/add-collateral-core.js';

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/** @file This is for use in tests in a3p-integration */

/** @type {CoreEvalBuilder} */
const stars2VaultProposalBuilder = async powers => {
  return vaultProposalBuilder(powers, {
    interchainAssetOptions: {
      denom: 'ibc/111C0FFEECAFE111',
      decimalPlaces: 6,
      keyword: 'OLIVES',
      oracleBrand: 'OLIVES',
      proposedName: 'OLIVES',
    },
  });
};

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('add-STARS2-collateral', stars2VaultProposalBuilder);
};
