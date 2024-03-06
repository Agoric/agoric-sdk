/* global process */
import { makeHelpers } from '@agoric/deploy-script-support';

const DEFAULT_CONTRACT_TERMS = {
  POLL_INTERVAL: 30n,
  maxSubmissionCount: 1000,
  minSubmissionCount: 2,
  restartDelay: 1, // the number of rounds an Oracle has to wait before they can initiate another round
  timeout: 10, // in seconds according to chainTimerService
  minSubmissionValue: 1n,
  maxSubmissionValue: 2n ** 256n,
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').ProposalBuilder} */
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

export const getBrandsAndProposalBuilder = async (options, endowments) => {
  const { lookup } = endowments;

  await null;
  const options1 = {
    ...options,
    brandIn: await lookup(options.IN_BRAND_LOOKUP).catch(() => undefined),
    brandOut: await lookup(options.OUT_BRAND_LOOKUP).catch(() => undefined),
  };
  return powers => defaultProposalBuilder(powers, options1);
};

export const createGov = async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);

  const {
    AGORIC_INSTANCE_NAME,
    IN_BRAND_DECIMALS = '6',
    IN_BRAND_LOOKUP = ['wallet', 'brand', 'BLD'],
    OUT_BRAND_DECIMALS = '6',
    OUT_BRAND_LOOKUP = ['agoricNames', 'oracleBrand', 'USD'],
    ORACLE_ADDRESSES,
  } = process.env;
  assert(AGORIC_INSTANCE_NAME, 'AGORIC_INSTANCE_NAME is required');
  assert(ORACLE_ADDRESSES, 'ORACLE_ADDRESSES is required');
  const oracleAddresses = ORACLE_ADDRESSES.split(',');

  const options = {
    AGORIC_INSTANCE_NAME,
    IN_BRAND_DECIMALS: parseInt(IN_BRAND_DECIMALS, 10),
    OUT_BRAND_DECIMALS: parseInt(OUT_BRAND_DECIMALS, 10),
    IN_BRAND_LOOKUP,
    OUT_BRAND_LOOKUP,
    oracleAddresses,
  };

  // gov-price-feed.js gov-price-feed-permit.json
  const proposalBuilder = await getBrandsAndProposalBuilder(
    options,
    endowments,
  );

  await writeCoreProposal('gov-price-feed', proposalBuilder);
};

export default createGov;
