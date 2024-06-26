/* global process */

import { DEFAULT_CONTRACT_TERMS } from '../inter-protocol/price-feed-core.js';

const { Fail } = assert;

/**
 * modified copy of ../inter-protocol/price-feed-core.js
 *
 * @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder}
 */
export const strictPriceFeedProposalBuilder = async (
  { publishRef, install },
  options,
) => {
  const {
    AGORIC_INSTANCE_NAME,
    IN_BRAND_LOOKUP,
    IN_BRAND_NAME = IN_BRAND_LOOKUP[IN_BRAND_LOOKUP.length - 1],
    ORACLE_ADDRESSES,
  } = options;

  const oracleAddresses = ORACLE_ADDRESSES;
  Array.isArray(oracleAddresses) ||
    Fail`ORACLE_ADDRESSES array is required; got ${oracleAddresses}`;

  AGORIC_INSTANCE_NAME ||
    Fail`AGORIC_INSTANCE_NAME is required; got ${AGORIC_INSTANCE_NAME}`;

  Array.isArray(IN_BRAND_LOOKUP) ||
    Fail`IN_BRAND_NAME array is required; got ${IN_BRAND_LOOKUP}`;

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

/**
 * @deprecated use `strictPriceFeedProposalBuilder` and specify arguments instead
 * @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder}
 */
export const deprecatedPriceFeedProposalBuilder = async (powers, options) => {
  console.warn(
    'deprecated ambient `priceFeedProposalBuilder`; use `strictPriceFeedProposalBuilder` instead',
  );

  const DEFAULT_ORACLE_ADDRESSES = [
    // XXX These are the oracle addresses. They must be provided before the chain
    // is running, which means they must be known ahead of time.
    // see https://github.com/Agoric/agoric-3-proposals/issues/5
    'agoric1lu9hh5vgx05hmlpfu47hukershgdxctk6l5s05',
    'agoric15lpnq2mjsdhtztf6khp7mrsq66hyrssspy92pd',
    'agoric1mwm224epc4l3pjcz7qsxnudcuktpynwkmnfqfp',
  ];

  const { GOV1ADDR, GOV2ADDR, GOV3ADDR } = process.env;
  const governanceAddressEnv = [GOV1ADDR, GOV2ADDR, GOV3ADDR].filter(x => x);
  const ORACLE_ADDRESSES = governanceAddressEnv.length
    ? governanceAddressEnv
    : DEFAULT_ORACLE_ADDRESSES;

  return strictPriceFeedProposalBuilder(powers, {
    ...options,
    ORACLE_ADDRESSES,
  });
};

/**
 * @deprecated use `strictPriceFeedProposalBuilder` and specify arguments instead
 * @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder}
 */
export const priceFeedProposalBuilder = deprecatedPriceFeedProposalBuilder;
