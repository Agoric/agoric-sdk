/* global process */

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
 * @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder}
 */
export const priceFeedProposalBuilder = async (
  { publishRef, install },
  options = {},
) => {
  const {
    AGORIC_INSTANCE_NAME,
    IN_BRAND_LOOKUP,
    IN_BRAND_NAME = IN_BRAND_LOOKUP[IN_BRAND_LOOKUP.length - 1],
  } = options;

  const { GOV1ADDR, GOV2ADDR, GOV3ADDR } = process.env;
  const oracleAddresses =
    GOV1ADDR || GOV2ADDR || GOV3ADDR
      ? [GOV1ADDR, GOV2ADDR, GOV3ADDR].filter(x => x)
      : ORACLE_ADDRESSES;
  assert(Array.isArray(oracleAddresses), 'oracleAddresses array is required');

  assert(AGORIC_INSTANCE_NAME, 'AGORIC_INSTANCE_NAME is required');

  assert.equal(IN_BRAND_LOOKUP[0], 'agoricNames');
  assert(IN_BRAND_NAME, 'brandIn is required');

  return harden({
    sourceSpec: '@agoric/inter-protocol/src/proposals/price-feed-proposal.js',
    getManifestCall: [
      'getManifestForPriceFeed',
      {
        AGORIC_INSTANCE_NAME,
        contractTerms: DEFAULT_CONTRACT_TERMS,
        oracleAddresses,
        IN_BRAND_NAME,
        IN_BRAND_DECIMALS: 6,
        OUT_BRAND_DECIMALS: 4,
        OUT_BRAND_NAME: 'USD',
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
