// @ts-check
import '../../../exported';
import './types';

import { makeRatio } from '../../contractSupport';
import { oneMinus, make100Percent, make0Percent } from './percent';

/**
 * Calculate the portion (as a Ratio) of the collateral that should be
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
  const collateralBrand = collateralMath.getBrand();
  if (strikeMath.isGTE(strikePrice1, price)) {
    return {
      longShare: make0Percent(collateralBrand),
      shortShare: make100Percent(collateralBrand),
    };
  } else if (strikeMath.isGTE(price, strikePrice2)) {
    return {
      longShare: make100Percent(collateralBrand),
      shortShare: make0Percent(collateralBrand),
    };
  }

  const denominator = strikeMath.subtract(strikePrice2, strikePrice1);
  const numerator = strikeMath.subtract(price, strikePrice1);
  const longShare = makeRatio(
    numerator.value,
    collateralBrand,
    denominator.value,
  );
  return { longShare, shortShare: oneMinus(longShare) };
}

harden(calculateShares);
export { calculateShares };
