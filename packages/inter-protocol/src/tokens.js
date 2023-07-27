// @ts-check

/** @typedef {'IST' | 'BLD'} TokenKeyword */

/**
 * Use static type check and unit tests rather than runtime import to avoid
 * bundling all of ERTP just to get Stable.symbol.
 *
 * @type {typeof import('@agoric/ertp').AssetKind.NAT}
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
