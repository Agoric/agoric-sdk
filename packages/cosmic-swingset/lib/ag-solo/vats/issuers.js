// @ts-check

export const CENTRAL_ISSUER_NAME = 'MOE';

/**
 * @typedef {Object} IssuerInitializationRecord
 * @property {Issuer} [issuer]
 * @property {Array<any>} [issuerArgs]
 * @property {string} pursePetname
 * @property {number} mintValue
 * @property {Array<[number, number]>} [fakeTradesGivenCentral]
 */

/** @type {Map<string, IssuerInitializationRecord>} */
export const fakeIssuerNameToRecord = new Map(
  harden([
    [
      '$LINK',
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
