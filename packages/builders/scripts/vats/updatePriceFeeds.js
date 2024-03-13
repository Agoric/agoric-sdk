/* global process */

import { makeHelpers } from '@agoric/deploy-script-support';
import { DEFAULT_CONTRACT_TERMS } from '../inter-protocol/price-feed-core.js';

const ORACLE_ADDRESSES = [
  // XXX These are the oracle addresses. They must be provided before the chain
  // is running, which means they must be known ahead of time.
  // see https://github.com/Agoric/agoric-3-proposals/issues/5
  'agoric1lu9hh5vgx05hmlpfu47hukershgdxctk6l5s05',
  'agoric15lpnq2mjsdhtztf6khp7mrsq66hyrssspy92pd',
  'agoric1mwm224epc4l3pjcz7qsxnudcuktpynwkmnfqfp',
];

/**
 * modified copy of ../inter-protocol/price-feed-core.js
 *
 * @type {import('@agoric/deploy-script-support/src/externalTypes.js').ProposalBuilder}
 */
export const defaultProposalBuilder = async (
  { publishRef, install },
  options = {},
) => {
  const {
    brandIn,
    brandOut,
    contractTerms = DEFAULT_CONTRACT_TERMS,
    AGORIC_INSTANCE_NAME,
    IN_BRAND_LOOKUP,
    OUT_BRAND_LOOKUP,
    IN_BRAND_NAME = IN_BRAND_LOOKUP[IN_BRAND_LOOKUP.length - 1],
    OUT_BRAND_NAME = OUT_BRAND_LOOKUP[OUT_BRAND_LOOKUP.length - 1],
    oracleAddresses,
    ...optionsRest
  } = options;

  assert(AGORIC_INSTANCE_NAME, 'AGORIC_INSTANCE_NAME is required');
  assert(Array.isArray(oracleAddresses), 'oracleAddresses array is required');

  if (brandIn) {
    publishRef(brandIn).catch(() => {});
  } else {
    assert.equal(IN_BRAND_LOOKUP[0], 'agoricNames');
    assert(IN_BRAND_NAME);
  }

  if (brandOut) {
    publishRef(brandOut).catch(() => {});
  } else {
    assert.equal(OUT_BRAND_LOOKUP[0], 'agoricNames');
    assert(OUT_BRAND_NAME);
  }

  return harden({
    sourceSpec: '@agoric/inter-protocol/src/proposals/price-feed-proposal.js',
    getManifestCall: [
      'getManifestForPriceFeed',
      {
        ...optionsRest,
        AGORIC_INSTANCE_NAME,
        contractTerms,
        oracleAddresses,
        IN_BRAND_NAME,
        OUT_BRAND_NAME,
        priceAggregatorRef: publishRef(
          install(
            '@agoric/inter-protocol/src/price/fluxAggregatorContract.js',
            '../bundles/bundle-fluxAggregatorKit.js',
          ),
        ),
      },
    ],
  });
};

export const pricefeedProposalBuilder = async (options, endowments) => {
  const { lookup } = endowments;

  const { ORACLE_ADDRESSES: ENV_ORACLE_ADDRESSES } = process.env;

  await null;
  const options1 = {
    ...options,
    IN_BRAND_DECIMALS: 6,
    OUT_BRAND_DECIMALS: 4,
    OUT_BRAND_LOOKUP: ['agoricNames', 'oracleBrand', 'USD'],
    oracleAddresses: ENV_ORACLE_ADDRESSES || ORACLE_ADDRESSES,
    brandIn: await lookup(options.IN_BRAND_LOOKUP).catch(() => undefined),
    brandOut: await lookup(options.OUT_BRAND_LOOKUP).catch(() => undefined),
  };
  return powers => defaultProposalBuilder(powers, options1);
};

export const getAtomFeedProposalBuilder = async endowments => {
  return pricefeedProposalBuilder(
    {
      AGORIC_INSTANCE_NAME: 'ATOM-USD price feed',
      IN_BRAND_LOOKUP: ['agoricNames', 'oracleBrand', 'ATOM'],
    },
    endowments,
  );
};

export const getStAtomFeedProposalBuilder = async endowments => {
  return pricefeedProposalBuilder(
    {
      AGORIC_INSTANCE_NAME: 'stATOM-USD price feed',
      IN_BRAND_LOOKUP: ['agoricNames', 'oracleBrand', 'stATOM'],
    },
    endowments,
  );
};

export const getStTiaFeedProposalBuilder = async endowments => {
  return pricefeedProposalBuilder(
    {
      AGORIC_INSTANCE_NAME: 'stTIA-USD price feed',
      IN_BRAND_LOOKUP: ['agoricNames', 'oracleBrand', 'stTIA'],
    },
    endowments,
  );
};

export const getStOsmoFeedProposalBuilder = async endowments => {
  return pricefeedProposalBuilder(
    {
      AGORIC_INSTANCE_NAME: 'stOSMO-USD price feed',
      IN_BRAND_LOOKUP: ['agoricNames', 'oracleBrand', 'stOSMO'],
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
