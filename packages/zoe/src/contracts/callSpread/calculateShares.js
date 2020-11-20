// @ts-check
import '../../../exported';
import './types';

import { natSafeMath } from '../../contractSupport';

const { subtract, multiply, floorDivide } = natSafeMath;

const PERCENT_BASE = 100;

/**
 * Calculate the portion (as a percentage) of the collateral that should be
 * allocated to the long side of a call spread contract. price gives the value
 * of the underlying asset at closing that determines the payouts to the parties
 *
 * @type {CalculateShares} */
function calculateShares(strikeMath, price, strikePrice1, strikePrice2) {
  if (strikeMath.isGTE(strikePrice1, price)) {
    return { longShare: 0, shortShare: PERCENT_BASE };
  } else if (strikeMath.isGTE(price, strikePrice2)) {
    return { longShare: PERCENT_BASE, shortShare: 0 };
  }

  const denominator = strikeMath.subtract(strikePrice2, strikePrice1).value;
  const numerator = strikeMath.subtract(price, strikePrice1).value;
  const longShare = floorDivide(multiply(PERCENT_BASE, numerator), denominator);
  return { longShare, shortShare: subtract(PERCENT_BASE, longShare) };
}

harden(calculateShares);
export { calculateShares };
