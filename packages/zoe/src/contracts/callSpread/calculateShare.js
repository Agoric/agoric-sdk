// @ts-check
import '../../../exported';
import './types';

import { natSafeMath } from '../../contractSupport';

const { multiply, floorDivide } = natSafeMath;

const PERCENT_BASE = 100;

/**
 * calculate the portion (as a percentage) of the collateral that should be
 * allocated to the long side of a call spread contract.
 *
 * @param {AmountMath} strikeMath the math to use
 * @param {Amount} price the value of the underlying asset at closing that
 * determines the payouts to the parties
 * @param {Amount} strikePrice1 the lower strike price
 * @param {Amount} strikePrice2 the upper strike price
 *
 * if price <= strikePrice1, return 0
 * if price >= strikePrice2, return 100.
 * Otherwise return a number between 1 and 99 reflecting the position of price
 * in the range from strikePrice1 to strikePrice2.
 */
function calculateShare(strikeMath, price, strikePrice1, strikePrice2) {
  if (strikeMath.isGTE(strikePrice1, price)) {
    return 0;
  } else if (strikeMath.isGTE(price, strikePrice2)) {
    return PERCENT_BASE;
  }

  const denominator = strikeMath.subtract(strikePrice2, strikePrice1).value;
  const numerator = strikeMath.subtract(price, strikePrice1).value;
  return floorDivide(multiply(PERCENT_BASE, numerator), denominator);
}

harden(calculateShare);
export { calculateShare };
