// @ts-check
import { M } from '@agoric/ertp';
import '../../../exported';
import './types';

import {
  makeAll,
  makeNone,
  calculatePercent,
} from '../../contractSupport/percentMath';

/**
 * Calculate the portion (as a percentage) of the collateral that should be
 * allocated to the long side of a call spread contract. price gives the value
 * of the underlying asset at closing that determines the payouts to the parties
 *
 * @type {CalculateShares} */
function calculateShares(
  strikeMath,
  collateralMath,
  price,
  strikePrice1,
  strikePrice2,
) {
  if (M.isGTE(strikePrice1, price)) {
    return {
      longShare: makeNone(collateralMath),
      shortShare: makeAll(collateralMath),
    };
  } else if (M.isGTE(price, strikePrice2)) {
    return {
      longShare: makeAll(collateralMath),
      shortShare: makeNone(collateralMath),
    };
  }

  const denominator = M.subtract(strikePrice2, strikePrice1);
  const numerator = M.subtract(price, strikePrice1);
  const longShare = calculatePercent(
    numerator,
    denominator,
    collateralMath,
    10000,
  );
  return { longShare, shortShare: longShare.complement() };
}

harden(calculateShares);
export { calculateShares };
