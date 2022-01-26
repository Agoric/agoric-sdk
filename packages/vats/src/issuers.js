// @ts-check
import { assert } from '@agoric/assert';
import { Nat } from '@agoric/nat';

export const CENTRAL_ISSUER_NAME = 'RUN';

/**
 * @typedef {Object} CollateralConfig
 * @property {string} keyword
 * @property {bigint} collateralValue the initial price of this collateral is
 * provided by tradesGivenCentral[0]
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
 * @property {string} [bankDenom]
 * @property {string} [bankPurse]
 * @property {Payment} [bankPayment]
 * @property {Array<[string, bigint]>} [defaultPurses]
 * @property {Array<[bigint, bigint]>} [tradesGivenCentral]
 */

/**
 * @callback Scaler Scale a number from a (potentially fractional) input to a
 * fixed-precision bigint
 * @param {bigint | number} n the input number to scale, must be a
 * natural number
 * @param {number} [fromDecimalPlaces=0] number of decimal places to keep from the input
 * @returns {bigint} the scaled integer
 */

/**
 * Create a decimal scaler.
 *
 * @param {number} toDecimalPlaces number of decimal places in the scaled value
 * @returns {Scaler}
 */
export const makeScaler = toDecimalPlaces => {
  assert.typeof(toDecimalPlaces, 'number');
  Nat(toDecimalPlaces);
  return (n, fromDecimalPlaces = 0) => {
    assert.typeof(fromDecimalPlaces, 'number');
    Nat(fromDecimalPlaces);
    if (typeof n === 'bigint') {
      // Bigints never preserve decimal places.
      return Nat(n) * 10n ** Nat(toDecimalPlaces);
    }
    // Fractional scaling needs a number, not a bigint.
    assert.typeof(n, 'number');
    return (
      Nat(Math.floor(n * 10 ** fromDecimalPlaces)) *
      10n ** Nat(toDecimalPlaces - fromDecimalPlaces)
    );
  };
};
export const scaleMills = makeScaler(4);
export const scaleMicro = makeScaler(6);
export const scaleEth = makeScaler(18);
export const scaleCentral = scaleMicro;

/** @type {[string, IssuerInitializationRecord]} */
const BLD_ISSUER_ENTRY = [
  'BLD',
  {
    issuerArgs: [undefined, { decimalPlaces: 6 }],
    defaultPurses: [['Agoric staking token', scaleMicro(5000)]],
    bankDenom: 'ubld',
    bankPurse: 'Agoric staking token',
    tradesGivenCentral: [
      [scaleCentral(1.23, 2), scaleMicro(1)],
      [scaleCentral(1.21, 2), scaleMicro(1)],
      [scaleCentral(1.22, 2), scaleMicro(1)],
    ],
  },
];
harden(BLD_ISSUER_ENTRY);
export { BLD_ISSUER_ENTRY };

/** @type {(centralRecord: Partial<IssuerInitializationRecord>) => Array<[string, IssuerInitializationRecord]>} */
const fromCosmosIssuerEntries = centralRecord => [
  [
    CENTRAL_ISSUER_NAME,
    {
      issuerArgs: [undefined, { decimalPlaces: 6 }],
      defaultPurses: [['Agoric RUN currency', scaleMicro(53)]],
      bankPurse: 'Agoric RUN currency',
      tradesGivenCentral: [[1n, 1n]],
      ...centralRecord,
    },
  ],
  BLD_ISSUER_ENTRY,
];

harden(fromCosmosIssuerEntries);
export { fromCosmosIssuerEntries };

/**
 * Note that we can still add these fake currencies to be traded on the AMM.
 * Just don't add a defaultPurses entry if you don't want them to be given out
 * on bootstrap.  They might still be tradable on the AMM.
 *
 * @param {boolean} noObviouslyFakeCurrencies
 * @returns {Array<[string, IssuerInitializationRecord]>}
 */
export const demoIssuerEntries = noObviouslyFakeCurrencies => {
  const doFakePurses = noObviouslyFakeCurrencies ? undefined : true;
  return [
    /* We actually can IBC-transfer Atoms via Pegasus right now. */
    [
      'ATOM',
      {
        issuerArgs: [undefined, { decimalPlaces: 6 }],
        defaultPurses: doFakePurses && [['Cosmos Staking', scaleMicro(68)]],
        collateralConfig: {
          keyword: 'ATOM',
          collateralValue: scaleMicro(1_000_000n),
          initialMarginPercent: 150n,
          liquidationMarginPercent: 125n,
          interestRateBasis: 250n,
          loanFeeBasis: 1n,
        },
        tradesGivenCentral: [
          [scaleCentral(33.28, 2), scaleMicro(1)],
          [scaleCentral(34.61, 2), scaleMicro(1)],
          [scaleCentral(37.83, 2), scaleMicro(1)],
        ],
      },
    ],
    [
      'WETH',
      {
        issuerArgs: [undefined, { decimalPlaces: 18 }],
        collateralConfig: {
          keyword: 'WETH',
          collateralValue: scaleEth(1_000_000n),
          initialMarginPercent: 150n,
          liquidationMarginPercent: 125n,
          interestRateBasis: 250n,
          loanFeeBasis: 1n,
        },
        tradesGivenCentral: [
          [scaleCentral(3286.01, 2), scaleEth(1)],
          [scaleCentral(3435.86, 2), scaleEth(1)],
          [scaleCentral(3443.21, 2), scaleEth(1)],
        ],
      },
    ],
    [
      'LINK',
      {
        issuerArgs: [undefined, { decimalPlaces: 18 }],
        defaultPurses: [['Oracle fee', scaleEth(51n)]],
        collateralConfig: {
          keyword: 'LINK',
          collateralValue: scaleEth(1_000_000n),
          initialMarginPercent: 150n,
          liquidationMarginPercent: 125n,
          interestRateBasis: 250n,
          loanFeeBasis: 1n,
        },
        tradesGivenCentral: [
          [scaleCentral(26.9, 2), scaleEth(1)],
          [scaleCentral(30.59, 2), scaleEth(1)],
          [scaleCentral(30.81, 2), scaleEth(1)],
        ],
      },
    ],
    [
      'USDC',
      {
        issuerArgs: [undefined, { decimalPlaces: 18 }],
        defaultPurses: [['USD Coin', scaleEth(1_323n)]],
        collateralConfig: {
          keyword: 'USDC',
          collateralValue: scaleEth(10_000_000n),
          initialMarginPercent: 150n,
          liquidationMarginPercent: 125n,
          interestRateBasis: 250n,
          loanFeeBasis: 1n,
        },
        tradesGivenCentral: [[scaleCentral(1), scaleEth(1)]],
      },
    ],
    [
      'moola',
      {
        defaultPurses: doFakePurses && [['Fun budget', 1900n]],
        tradesGivenCentral: [
          [scaleCentral(1), 1n],
          [scaleCentral(1.3, 1), 1n],
          [scaleCentral(1.2, 1), 1n],
          [scaleCentral(1.8, 1), 1n],
          [scaleCentral(1.5, 1), 1n],
        ],
      },
    ],
    [
      'simolean',
      {
        defaultPurses: doFakePurses && [['Nest egg', 970n]],
        tradesGivenCentral: [
          [scaleCentral(21.35, 2), 1n],
          [scaleCentral(21.72, 2), 1n],
          [scaleCentral(21.24, 2), 1n],
        ],
      },
    ],
  ];
};

harden(demoIssuerEntries);
