// @ts-check
import { assert } from '@agoric/assert';
import { Nat } from '@agoric/nat';

export const CENTRAL_ISSUER_NAME = 'RUN';

/** @typedef {number | bigint} Bigish */

/**
 * @typedef {Object} CollateralConfig
 * @property {string} keyword
 * @property {Bigish} collateralValue the initial price of this collateral is
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
 * @property {Array<[string, Bigish]>} [defaultPurses]
 * @property {Array<[Bigish, Bigish]>} [tradesGivenCentral]
 */

/**
 * @callback Scaler Scale a number from a (potentially fractional) input to a
 * fixed-precision bigint
 * @param {Bigish} n the input number to scale
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
  // I'm not sure why.  Here is the error message:
  /*
2021-04-01T19:22:22.268Z SwingSet: vat: v16: ----- ST.5  5 depositValue {
  Central: {
    brand: Alleged: Scones brand <[Object: null prototype] [Alleged: Scones brand] {}> [Alleged: Scones brand] {},
    value: 0n
  },
  Liquidity: {
    brand: Alleged: LINKLiquidity brand <[Object: null prototype] [Alleged: LINKLiquidity brand] {}> [Alleged: LINKLiquidity brand] {},
    value: 27900000000000n
  },
  Secondary: {
    brand: Alleged: LINK brand <[Object: null prototype] [Alleged: LINK brand] {}> [Alleged: LINK brand] {},
    value: 0n
  }
}
2021-04-01T19:23:07.013Z start: swingset running
2021-04-01T19:23:07.014Z outbound: invoking deliverator; 1 new messages for mySimGCI
2021-04-01T19:23:07.119Z fake-chain: delivering to mySimGCI (trips=1)
Open CapTP connection to ws://127.0.0.1:8000/private/captp..........2021-04-01T19:23:15.382Z web: 127.0.0.1:57343[3]: new WebSocket /private/captp?accessToken=4S0eZD5CRoeSeMHQW3XO8lM6GWYgNmRuwwF2TUy3-AO4XK_qYokaYp4aUTTe7sV7
ooooooooooooooooooooooooooo2021-04-01T19:23:41.000Z SwingSet: vat: v3: IBC downcall bindPort { packet: { source_port: 'echo' } }
2021-04-01T19:23:41.022Z SwingSet: ls: v14: Logging sent error stack (Error#1)
Error#1: already have remote mySimGCI-client

  at Alleged: vat-tp handler.addRemote (packages/SwingSet/src/vats/vat-tp.js:150:14)

Error#1 ERROR_NOTE: Thrown from: (Error#2) : 1407 . 0
Error#1 ERROR_NOTE: Sent as error:liveSlots:v14#1
Nested error under Error#1
  Error#2: Event: 1406.1
  
    at Function.applyMethod (packages/tame-metering/src/tame.js:184:20)
    at meteredConstructor.deliver (packages/SwingSet/src/kernel/liveSlots.js:522:28)
    at eval* (packages/SwingSet/src/kernel/vatManager/deliver.js:51:48)
  
2021-04-01T19:23:41.028Z SwingSet: ls: v11: Logging sent error stack (Error#3)
Error#3: already have remote (a string)

  at fullRevive (packages/marshal/src/marshal.js:869:36)
  at meteredConstructor.unserialize (packages/marshal/src/marshal.js:953:19)
  at notifyOnePromise (packages/SwingSet/src/kernel/liveSlots.js:594:19)
  at meteredConstructor.notify (packages/SwingSet/src/kernel/liveSlots.js:607:7)
  at eval* (packages/SwingSet/src/kernel/vatManager/deliver.js:51:48)

Error#3 ERROR_NOTE: Received as error:liveSlots:v14#1
Error#3 ERROR_NOTE: Rejection from: (Error#4) : 1404 . 0
Error#3 ERROR_NOTE: Rejection from: (Error#5) : 60 . 1
Error#3 ERROR_NOTE: Sent as error:liveSlots:v11#1
Nested 2 errors under Error#3
  Error#4: Event: 1403.1
  
    at Function.applyMethod (packages/tame-metering/src/tame.js:184:20)
    at Proxy.eval* (packages/eventual-send/src/E.js:37:49)
    at eval* (packages/cosmic-swingset/t3/vats/bootstrap.js:639:15)
    at Array.map (<anonymous>)
    at Array.map (packages/tame-metering/src/tame.js:184:20)
    at Alleged: root.bootstrap (packages/cosmic-swingset/t3/vats/bootstrap.js:636:38)
  
  Error#5: Event: 59.1
  
    at Function.applyMethod (packages/tame-metering/src/tame.js:184:20)
    at meteredConstructor.deliver (packages/SwingSet/src/kernel/liveSlots.js:522:28)
    at eval* (packages/SwingSet/src/kernel/vatManager/deliver.js:51:48)
  
2021-04-01T19:23:41.029Z SwingSet: kernel: ##### KERNEL PANIC: kp40.policy panic: rejected {"body":"{\"@qclass\":\"error\",\"errorId\":\"error:liveSlots:v11#1\",\"message\":\"already have remote (a string)\",\"name\":\"Error\"}","slots":[]} #####
2021-04-01T19:23:41.030Z fake-chain: error fake processing (Error#6)
Error#6: kernel panic kp40.policy panic: rejected {"body":"{\"@qclass\":\"error\",\"errorId\":\"error:liveSlots:v11#1\",\"message\":\"already have remote (a string)\",\"name\":\"Error\"}","slots":[]}
*/
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
