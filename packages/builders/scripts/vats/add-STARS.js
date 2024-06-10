import { makeHelpers } from '@agoric/deploy-script-support';
import { defaultProposalBuilder as vaultProposalBuilder } from '../inter-protocol/add-collateral-core.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const starsVaultProposalBuilder = async powers => {
  return vaultProposalBuilder(powers, {
    interchainAssetOptions: {
      // Values for the Stargaze token on Osmosis
      denom:
        'ibc/987C17B11ABC2B20019178ACE62929FE9840202CE79498E29FE8E5CB02B7C0A4',
      decimalPlaces: 6,
      keyword: 'STARS',
      oracleBrand: 'STARS',
      proposedName: 'STARS',
    },
  });
};

export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('add-STARS-collateral', starsVaultProposalBuilder);
};
