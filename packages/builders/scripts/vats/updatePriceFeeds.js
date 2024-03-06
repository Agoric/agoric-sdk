import { makeHelpers } from '@agoric/deploy-script-support';
import { getBrandsAndProposalBuilder as pricefeedProposalBuilder } from '../inter-protocol/price-feed-core.js';

const ORACLE_ADDRESSES = [
  // 'agoric1cn8dwvv3ac329sujgpqmccv6xd9d3sagd2t5l9',
  // 'agoric1dxe9dqu4ejpctnp2un7s4l7l8hny6dzr8juur3',
  // 'agoric1y750klm8sh8yh4h4mcssx5m7rmvuu8mhk89t0c',

  // XXX These are the GOV1ADDR, etc addresses. What should this file specify?
  'agoric1mefw5jhvqh60la7mltgny2pnn2dpgrs5yjlcqt',
  'agoric1l4u888p0wtgh2m8q0uzgxry06lm6ct4nyaz3py',
  'agoric1k8y8l8996p9ldzt9kng8uwz6ttjhhl49uzjdt8',
];

export const getAtomFeedProposalBuilder = async endowments => {
  return pricefeedProposalBuilder(
    {
      AGORIC_INSTANCE_NAME: 'ATOM-USD price feed',
      IN_BRAND_DECIMALS: 6,
      IN_BRAND_LOOKUP: ['agoricNames', 'oracleBrand', 'ATOM'],
      OUT_BRAND_DECIMALS: 4,
      OUT_BRAND_LOOKUP: ['agoricNames', 'oracleBrand', 'USD'],
      oracleAddresses: ORACLE_ADDRESSES,
    },
    endowments,
  );
};

export const getStAtomFeedProposalBuilder = async endowments => {
  return pricefeedProposalBuilder(
    {
      AGORIC_INSTANCE_NAME: 'stATOM-USD price feed',
      IN_BRAND_DECIMALS: 6,
      IN_BRAND_LOOKUP: ['agoricNames', 'oracleBrand', 'stATOM'],
      OUT_BRAND_DECIMALS: 4,
      OUT_BRAND_LOOKUP: ['agoricNames', 'oracleBrand', 'USD'],
      oracleAddresses: ORACLE_ADDRESSES,
    },
    endowments,
  );
};

export const getStTiaFeedProposalBuilder = async endowments => {
  return pricefeedProposalBuilder(
    {
      AGORIC_INSTANCE_NAME: 'stTIA-USD price feed',
      IN_BRAND_DECIMALS: 6,
      IN_BRAND_LOOKUP: ['agoricNames', 'oracleBrand', 'stTIA'],
      OUT_BRAND_DECIMALS: 4,
      OUT_BRAND_LOOKUP: ['agoricNames', 'oracleBrand', 'USD'],
      oracleAddresses: ORACLE_ADDRESSES,
    },
    endowments,
  );
};

export const getStOsmoFeedProposalBuilder = async endowments => {
  return pricefeedProposalBuilder(
    {
      AGORIC_INSTANCE_NAME: 'stOSMO-USD price feed',
      IN_BRAND_DECIMALS: 6,
      IN_BRAND_LOOKUP: ['agoricNames', 'oracleBrand', 'stOSMO'],
      OUT_BRAND_DECIMALS: 4,
      OUT_BRAND_LOOKUP: ['agoricNames', 'oracleBrand', 'USD'],
      oracleAddresses: ORACLE_ADDRESSES,
    },
    endowments,
  );
};

export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);

  const [
    atomFeedProposalBuilder,
    stAtomFeedProposalBuilder,
    stTiaFeedProposalBuilder,
    stOsmoFeedProposalBuilder,
  ] = await Promise.all([
    getAtomFeedProposalBuilder(endowments),
    getStAtomFeedProposalBuilder(endowments),
    getStTiaFeedProposalBuilder(endowments),
    getStOsmoFeedProposalBuilder(endowments),
  ]);

  await writeCoreProposal('updateAtom', atomFeedProposalBuilder);
  await writeCoreProposal('updateStAtom', stAtomFeedProposalBuilder);
  await writeCoreProposal('updateStTia', stTiaFeedProposalBuilder);
  await writeCoreProposal('updateStOsmo', stOsmoFeedProposalBuilder);
};
