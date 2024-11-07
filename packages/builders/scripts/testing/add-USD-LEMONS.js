import { makeHelpers } from '@agoric/deploy-script-support';
import { psmProposalBuilder } from '../inter-protocol/add-collateral-core.js';

const addUsdLemonsProposalBuilder = async powers => {
  return psmProposalBuilder(powers, {
    anchorOptions: {
      denom: 'ibc/000C0AAAEECAFE000',
      keyword: 'USD_LEMONS',
      decimalPlaces: 6,
      proposedName: 'USD_LEMONS',
    },
  });
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('add-LEMONS-PSM', addUsdLemonsProposalBuilder);
};
