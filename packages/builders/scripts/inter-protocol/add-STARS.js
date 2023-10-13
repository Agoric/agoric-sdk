import { makeHelpers } from '@agoric/deploy-script-support';
import { defaultProposalBuilder as vaultProposalBuilder } from './add-collateral-core.js';
import { defaultProposalBuilder as oraclesProposalBuilder } from './price-feed-core.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').ProposalBuilder} */
export const starsVaultProposalBuilder = async powers => {
  return vaultProposalBuilder(powers, {
    interchainAssetOptions: {
      denom:
        'ibc/49C630713B2AB60653F76C0C58D43C2A64956803B4D422CACB6DD4AD016ED846',
      decimalPlaces: 6,
      initialPrice: undefined,
      issuerBoardId: undefined,
      issuerName: 'stATOM',
      keyword: 'STATOM',
      oracleBrand: 'stATOM',
      proposedName: 'stATOM',
    },
  });
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').ProposalBuilder} */
export const starsOraclesProposalBuilder = async powers => {
  return oraclesProposalBuilder(powers, {
    AGORIC_INSTANCE_NAME: `stATOM-USD price feed`,
    IN_BRAND_LOOKUP: ['agoricNames', 'oracleBrand', 'stATOM'],
    IN_BRAND_DECIMALS: 6,
    OUT_BRAND_LOOKUP: ['agoricNames', 'oracleBrand', 'USD'],
    OUT_BRAND_DECIMALS: 4,
    oracleAddresses: [
      'agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce',
      'agoric140dmkrz2e42ergjj7gyvejhzmjzurvqeq82ang',
      'agoric1w8wktaur4zf8qmmtn3n7x3r0jhsjkjntcm3u6h',
      'agoric10vjkvkmpp9e356xeh6qqlhrny2htyzp8hf88fk',
      'agoric1qj07c7vfk3knqdral0sej7fa6eavkdn8vd8etf',
      'agoric1lw4e4aas9q84tq0q92j85rwjjjapf8dmnllnft',
      'agoric1ra0g6crtsy6r3qnpu7ruvm7qd4wjnznyzg5nu4',
      'agoric1zj6vrrrjq4gsyr9lw7dplv4vyejg3p8j2urm82',
      'agoric15xddzse9lq74cyt6ev9d7wywxerenxdgxsdc3m',
      'agoric1w5wmck6q2xrt20ax3njlk2k87m4t4l2y2xgw2d',
    ],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('add-stATOM', starsVaultProposalBuilder);
  await writeCoreProposal('add-stATOM-oracles', starsOraclesProposalBuilder);
};
