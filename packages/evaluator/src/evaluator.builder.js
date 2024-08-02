import { makeHelpers } from '@agoric/deploy-script-support';
import { startAgoricEvaluator } from './proposals/start-evaluator.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) => {
  let invitedOwners = {
    atredis1: 'agoric1paxqxfmz9a0w509q80ypwc0hkz3g2jnhcjf7nt',
    atredis2: 'agoric1cyhnt00v8z0g5s6vjnwe4wykrs3x6km6wj22xw',
    agoricsec1: 'agoric1wh060h62uc7m98trnn49hx9x80sqwzyamguawq',
  };

  if (process.env.AGORIC_EVALUATOR_INVITED_OWNERS){
    invitedOwners = JSON.parse(process.env.AGORIC_EVALUATOR_INVITED_OWNERS);
  }

  return harden({
    sourceSpec: './proposals/start-evaluator.js',
    getManifestCall: [
      'getManifestForContract',
      {
        installKeys: {
          agoricEvaluator: publishRef(install('./evaluator.contract.js')),
        },
        isDriver: true,
        invitedOwners,
      },
    ],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(startAgoricEvaluator.name, defaultProposalBuilder);
};
