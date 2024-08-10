import { makeHelpers } from '@agoric/deploy-script-support';
import { defaultProposalBuilder as vaultProposalBuilder } from '../inter-protocol/add-collateral-core.js';

/** @file This is for use in tests in a3p-integration */

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
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

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('add-STARS-collateral', starsVaultProposalBuilder);
};
