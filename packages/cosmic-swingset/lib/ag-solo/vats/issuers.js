// @ts-check

export const CENTRAL_ISSUER_NAME = 'MOE';

/** @typedef {number | bigint} Bigish */

/**
 * @typedef {Object} CollateralConfig
 * @property {string} keyword
 * @property {Bigish} collateralValue
 * @property {bigint} initialPricePercent
 * @property {bigint} initialMarginPercent
 * @property {bigint} liquidationMarginPercent
 * @property {bigint} interestRateBasis
 * @property {bigint} loanFeeBasis
 */

/**
 * @typedef {Object} IssuerInitializationRecord
 * @property {Issuer} [issuer]
 * @property {Brand} [brand]
 * @property {Array<any>} [issuerArgs]
 * @property {CollateralConfig} [collateralConfig]
 * @property {string} pursePetname
 * @property {Bigish} mintValue
 * @property {Array<[Bigish, Bigish]>} [fakeTradesGivenCentral]
 */

/** @type {Array<[string, IssuerInitializationRecord]>} */
const fakeIssuerEntries = [
  [
    '$LINK',
    {
      issuerArgs: [undefined, { decimalPlaces: 18 }],
      mintValue: 7n * 10n ** 18n,
      collateralConfig: {
        keyword: 'LINK',
        collateralValue: 6000n * 10n ** 18n,
        initialPricePercent: 125n,
        initialMarginPercent: 150n,
        liquidationMarginPercent: 125n,
        interestRateBasis: 250n,
        loanFeeBasis: 50n,
      },
      pursePetname: 'Oracle fee',
      fakeTradesGivenCentral: [
        [1000, 3000n * 10n ** 15n],
        [1000, 2500n * 10n ** 15n],
        [1000, 2750n * 10n ** 15n],
      ],
    },
  ],
  [
    'moola',
    {
      mintValue: 1900,
      collateralConfig: {
        collateralValue: 74000,
        keyword: 'Moola',
        initialPricePercent: 150n,
        initialMarginPercent: 150n,
        liquidationMarginPercent: 120n,
        interestRateBasis: 200n,
        loanFeeBasis: 150n,
      },
      pursePetname: 'Fun budget',
      fakeTradesGivenCentral: [
        [10, 1],
        [13, 1],
        [12, 1],
        [18, 1],
        [15, 1],
      ],
    },
  ],
  [
    'simolean',
    {
      mintValue: 1900,
      collateralConfig: {
        collateralValue: 96800,
        keyword: 'Simolean',
        initialPricePercent: 110n,
        initialMarginPercent: 120n,
        liquidationMarginPercent: 105n,
        interestRateBasis: 100n,
        loanFeeBasis: 225n,
      },
      pursePetname: 'Nest egg',
      fakeTradesGivenCentral: [
        [2135, 50],
        [2172, 50],
        [2124, 50],
      ],
    },
  ],
];

harden(fakeIssuerEntries);
export { fakeIssuerEntries };
