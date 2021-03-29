// @ts-check

export const CENTRAL_ISSUER_NAME = 'Testnet.$USD';

/**
 * @typedef {Object} IssuerInitializationRecord
 * @property {Array<any>} [issuerArgs]
 * @property {string} pursePetname
 * @property {number} mintValue
 * @property {Array<[number, number]>} [fakeTradesGivenCentral]
 */

/** @type {Map<string, IssuerInitializationRecord>} */
export const fakeIssuerNameToRecord = new Map(
  harden([
    [
      CENTRAL_ISSUER_NAME,
      {
        issuerArgs: [undefined, { decimalPlaces: 3 }],
        mintValue: 20000,
        pursePetname: 'Local currency',
        fakeTradesGivenCentral: [[1, 1]],
      },
    ],
    [
      'Testnet.$LINK',
      {
        issuerArgs: [undefined, { decimalPlaces: 6 }],
        mintValue: 7 * 10 ** 6,
        pursePetname: 'Oracle fee',
        fakeTradesGivenCentral: [
          [1000, 3000000],
          [1000, 2500000],
          [1000, 2750000],
        ],
      },
    ],
    [
      'moola',
      {
        mintValue: 1900,
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
      'MOE',
      {
        mintValue: 0,
        pursePetname: 'MOE funds',
        fakeTradesGivenCentral: [
          [10, 15],
          [13, 9],
          [12, 13],
          [18, 15],
          [15, 17],
        ],
      },
    ],
    [
      'simolean',
      {
        mintValue: 1900,
        pursePetname: 'Nest egg',
        fakeTradesGivenCentral: [
          [2135, 50],
          [2172, 50],
          [2124, 50],
        ],
      },
    ],
  ]),
);
