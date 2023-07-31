// @ts-check

/** @typedef {'IST' | 'BLD'} TokenKeyword */

/**
 * This is defined by ERTP. For dependency pragmatism it's repeated here. We
 * rely on the static type check and unit tests to detect any incompatibility.
 */
const NAT = 'nat';

export const Stable = harden(
  /** @type {const} */ ({
    symbol: 'IST',
    denom: 'uist',
    proposedName: 'Agoric stable token',
    assetKind: NAT,
    displayInfo: {
      decimalPlaces: 6,
      assetKind: NAT,
    },
  }),
);

export const Stake = harden(
  /** @type {const} */ ({
    symbol: 'BLD',
    denom: 'ubld',
    proposedName: 'Agoric staking token',
    assetKind: NAT,
    displayInfo: {
      decimalPlaces: 6,
      assetKind: NAT,
    },
  }),
);
