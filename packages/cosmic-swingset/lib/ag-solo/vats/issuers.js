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
    'LINK',
    {
      issuerArgs: [undefined, { decimalPlaces: 18 }],
      mintValue: 51n * 10n ** 18n,
      collateralConfig: {
        keyword: 'LINK',
        collateralValue: 1000000n * 10n ** 18n,
        initialPricePercent: 125n,
        initialMarginPercent: 150n,
        liquidationMarginPercent: 125n,
        interestRateBasis: 250n,
        loanFeeBasis: 50n,
      },
      pursePetname: 'Oracle fee',
      fakeTradesGivenCentral: [
        [279000n, 10n ** 18n],
        [257000n, 10n ** 18n],
        [268000n, 10n ** 18n],
      ],
    },
  ],
  [
    'moola',
    {
      mintValue: 1900,
      collateralConfig: {
        collateralValue: 7400000,
        keyword: 'Moola',
        initialPricePercent: 150n,
        initialMarginPercent: 150n,
        liquidationMarginPercent: 120n,
        interestRateBasis: 200n,
        loanFeeBasis: 150n,
      },
      pursePetname: 'Fun budget',
      fakeTradesGivenCentral: [
        [10000, 1],
        [13000, 1],
        [12000, 1],
        [18000, 1],
        [15000, 1],
      ],
    },
  ],
  [
    'simolean',
    {
      mintValue: 970,
      collateralConfig: {
        collateralValue: 968000,
        keyword: 'Simolean',
        initialPricePercent: 110n,
        initialMarginPercent: 120n,
        liquidationMarginPercent: 105n,
        interestRateBasis: 100n,
        loanFeeBasis: 225n,
      },
      pursePetname: 'Nest egg',
      fakeTradesGivenCentral: [
        [213500, 1],
        [217200, 1],
        [212400, 1],
      ],
    },
  ],
];

harden(fakeIssuerEntries);
export { fakeIssuerEntries };
