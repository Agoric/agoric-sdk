// @ts-check

import { AssetKind } from '@agoric/ertp';
import { assertKeywordName } from '@agoric/zoe/src/cleanProposal.js';

/** @typedef { 'IST' | 'BLD' } TokenKeyword */

export const Stable = harden(
  /** @type {const } */ ({
    symbol: 'IST',
    denom: 'uist',
    proposedName: 'Agoric stable local currency',
    assetKind: AssetKind.NAT,
    displayInfo: {
      decimalPlaces: 6,
      assetKind: AssetKind.NAT,
    },
  }),
);

export const Stake = harden(
  /** @type {const } */ ({
    symbol: 'BLD',
    denom: 'ubld',
    proposedName: 'Agoric staking token',
    assetKind: AssetKind.NAT,
    displayInfo: {
      decimalPlaces: 6,
      assetKind: AssetKind.NAT,
    },
  }),
);

assertKeywordName(Stable.symbol);
assertKeywordName(Stake.symbol);
