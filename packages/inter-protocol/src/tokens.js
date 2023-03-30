// @ts-check

/** @typedef { 'IST' | 'BLD' } TokenKeyword */

/**
 * @typedef {object} FeeIssuerConfig
 * @property {string} name
 * @property {AssetKind} assetKind
 * @property {DisplayInfo} displayInfo
 */

/**
 * Use static type check and unit tests rather than runtime import
 * to avoid bundling all of ERTP just to get Stable.symbol.
 *
 * @type {typeof import('@agoric/ertp').AssetKind.NAT}
 */
const NAT = 'nat';

export const Stable = harden(
  /** @type {const } */ ({
    symbol: 'IST',
    denom: 'uist',
    proposedName: 'Agoric stable local currency',
    assetKind: NAT,
    displayInfo: {
      decimalPlaces: 6,
      assetKind: NAT,
    },
  }),
);

export const Stake = harden(
  /** @type {const } */ ({
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

/** @type {FeeIssuerConfig} */
export const stableFeeConfig = {
  name: Stable.symbol,
  assetKind: Stable.assetKind,
  displayInfo: Stable.displayInfo,
};
