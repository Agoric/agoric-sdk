// @ts-check

import '../../../exported';
import './types';

import { amountMath, isNatValue } from '@agoric/ertp';
import { assert } from '@agoric/assert';
import { makeRatio } from '../../contractSupport';
import { oneMinus, make100Percent, make0Percent } from './percent';

/**
 * Calculate the portion (as a Ratio) of the collateral that should be
 * allocated to the long side of a call spread contract. price gives the value
 * of the underlying asset at closing that determines the payouts to the parties
 *
 * @type {CalculateShares} */
function calculateShares(collateralBrand, price, strikePrice1, strikePrice2) {
  if (amountMath.isGTE(strikePrice1, price)) {
    return {
      longShare: make0Percent(collateralBrand),
      shortShare: make100Percent(collateralBrand),
    };
  } else if (amountMath.isGTE(price, strikePrice2)) {
    return {
      longShare: make100Percent(collateralBrand),
      shortShare: make0Percent(collateralBrand),
    };
  }

  const denominator = amountMath.subtract(strikePrice2, strikePrice1);
  const numerator = amountMath.subtract(price, strikePrice1);
  assert(isNatValue(numerator.value));
  assert(isNatValue(denominator.value));
  const longShare = makeRatio(
    numerator.value,
    collateralBrand,
    denominator.value,
  );
  return { longShare, shortShare: oneMinus(longShare) };
}

harden(calculateShares);
export { calculateShares };
