import { makeHelpers } from '@agoric/deploy-script-support';
import { psmProposalBuilder } from '../inter-protocol/add-collateral-core.js';

const addUsdOlivesProposalBuilder = async powers => {
  return psmProposalBuilder(powers, {
    anchorOptions: {
      denom: 'ibc/000C0AAAEECAFE111',
      keyword: 'USD_OLIVES',
      decimalPlaces: 6,
      proposedName: 'USD_OLIVES',
    },
  });
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('add-OLIVES-PSM', addUsdOlivesProposalBuilder);
};
