// @ts-check

export const CENTRAL_ISSUER_NAME = 'RUN';

/** @typedef {number | bigint} Bigish */

/**
 * @typedef {Object} CollateralConfig
 * @property {string} keyword
 * @property {Bigish} collateralValue
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
 * @property {Array<[string, Bigish]>} [defaultPurses]
 * @property {Array<[Bigish, Bigish]>} [tradesGivenCentral]
 */

export const makeScaler = toDecimals => (n, fromDecimals = 0) => {
  if (typeof n === 'bigint') {
    return n * 10n ** BigInt(toDecimals);
  }
  return (
    BigInt(Math.floor(n * 10 ** fromDecimals)) *
    10n ** BigInt(toDecimals - fromDecimals)
  );
};
export const scaleMills = makeScaler(4);
export const scaleMicro = makeScaler(6);
export const scaleEth = makeScaler(18);
export const scaleCentral = scaleMicro;

/** @type {Array<[string, IssuerInitializationRecord]>} */
const fromCosmosIssuerEntries = [
  [
    'BLD',
    {
      issuerArgs: [undefined, { decimalPlaces: 6 }],
      defaultPurses: [['Agoric staking token', scaleMicro(73)]],
      collateralConfig: {
        keyword: 'BLD',
        collateralValue: scaleMicro(1000000n),
        initialMarginPercent: 150n,
        liquidationMarginPercent: 125n,
        interestRateBasis: 250n,
        loanFeeBasis: 50n,
      },
      tradesGivenCentral: [
        [scaleCentral(27.9, 1), scaleMicro(1)],
        [scaleCentral(25.7, 1), scaleMicro(1)],
        [scaleCentral(26.8, 1), scaleMicro(1)],
      ],
    },
  ],
];

harden(fromCosmosIssuerEntries);
export { fromCosmosIssuerEntries };

/** @type {Array<[string, IssuerInitializationRecord]>} */
const fromPegasusIssuerEntries = [
  [
    'ATOM',
    {
      issuerArgs: [undefined, { decimalPlaces: 6 }],
      defaultPurses: [['Cosmos Staking', scaleMicro(68)]],
      collateralConfig: {
        keyword: 'ATOM',
        collateralValue: scaleMicro(1000000n),
        initialMarginPercent: 150n,
        liquidationMarginPercent: 125n,
        interestRateBasis: 250n,
        loanFeeBasis: 50n,
      },
      tradesGivenCentral: [
        [scaleCentral(18.61, 2), scaleMicro(1)],
        [scaleCentral(19.97, 2), scaleMicro(1)],
        [scaleCentral(19.17, 2), scaleMicro(1)],
      ],
    },
  ],
  [
    'ETH',
    {
      issuerArgs: [undefined, { decimalPlaces: 18 }],
      collateralConfig: {
        keyword: 'ETH',
        collateralValue: scaleEth(1000000n),
        initialMarginPercent: 150n,
        liquidationMarginPercent: 125n,
        interestRateBasis: 250n,
        loanFeeBasis: 50n,
      },
      tradesGivenCentral: [
        [scaleCentral(1914.86, 2), scaleEth(1)],
        [scaleCentral(1489.87, 2), scaleEth(1)],
        [scaleCentral(1924.4, 2), scaleEth(1)],
      ],
    },
  ],
  // FIXME: Either of these entries (LINK or USDC) screw up the bootstrap process.
  // I'm not sure why.
  /*
  [
    'LINK',
    {
      issuerArgs: [undefined, { decimalPlaces: 18 }],
      defaultPurses: [['Oracle fee', scaleEth(51n)]],
      collateralConfig: {
        keyword: 'LINK',
        collateralValue: scaleEth(1000000n),
        initialMarginPercent: 150n,
        liquidationMarginPercent: 125n,
        interestRateBasis: 250n,
        loanFeeBasis: 50n,
      },
      tradesGivenCentral: [
        [scaleCentral(27.9, 2), scaleEth(1)],
        [scaleCentral(25.7, 2), scaleEth(1)],
        [scaleCentral(26.8, 2), scaleEth(1)],
      ],
    },
  ],
  [
    'USDC',
    {
      issuerArgs: [undefined, { decimalPlaces: 18 }],
      defaultPurses: [['USD Coin', scaleEth(1323n)]],
      collateralConfig: {
        keyword: 'USDC',
        collateralValue: scaleEth(1000000n),
        initialMarginPercent: 150n,
        liquidationMarginPercent: 125n,
        interestRateBasis: 250n,
        loanFeeBasis: 50n,
      },
      tradesGivenCentral: [[scaleCentral(1), scaleEth(1)]],
    },
  ],
  */
];

harden(fromPegasusIssuerEntries);
export { fromPegasusIssuerEntries };

/** @type {Array<[string, IssuerInitializationRecord]>} */
const fakeIssuerEntries = [
  [
    'moola',
    {
      defaultPurses: [['Fun budget', 1900]],
      tradesGivenCentral: [
        [scaleCentral(1), 1],
        [scaleCentral(1.3, 1), 1],
        [scaleCentral(1.2, 1), 1],
        [scaleCentral(1.8, 1), 1],
        [scaleCentral(1.5, 1), 1],
      ],
    },
  ],
  [
    'simolean',
    {
      defaultPurses: [['Nest egg', 970]],
      tradesGivenCentral: [
        [scaleCentral(21.35, 2), 1],
        [scaleCentral(21.72, 2), 1],
        [scaleCentral(21.24, 2), 1],
      ],
    },
  ],
];

harden(fakeIssuerEntries);
export { fakeIssuerEntries };
