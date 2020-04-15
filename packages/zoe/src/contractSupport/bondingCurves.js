import harden from '@agoric/harden';

import { natSafeMath } from './safeMath';

const { add, subtract, multiply, floorDivide } = natSafeMath;

/**
 * Contains the logic for calculating how much should be given
 * back to the user in exchange for what they sent in. It also
 * calculates the new amount of the assets in the pool. Reused in
 * several different places, including to check whether an offer
 * is valid, getting the current price for an asset on user
 * request, and to do the actual reallocation after an offer has
 * been made.
 * @param  {extent} inputExtent - the extent of the assets sent in
 * to be swapped
 * @param  {extent} inputReserve - the extent in the liquidity
 * pool of the kind of asset sent in
 * @param  {extent} outputReserve - the extent in the liquidity
 * pool of the kind of asset to be sent out
 * @param  {number} feeBasisPoints=30 - the fee taken in
 * basis points. The default is 0.3% or 30 basis points. The fee is taken from
 * inputExtent
 */
export const getCurrentPrice = ({
  inputExtent,
  inputReserve,
  outputReserve,
  feeBasisPoints = 30,
}) => {
  const oneMinusFeeInTenThousandths = subtract(10000, feeBasisPoints);
  const inputWithFee = multiply(inputExtent, oneMinusFeeInTenThousandths);
  const numerator = multiply(inputWithFee, outputReserve);
  const denominator = add(multiply(inputReserve, 10000), inputWithFee);

  const outputExtent = floorDivide(numerator, denominator);
  const newOutputReserve = subtract(outputReserve, outputExtent);
  const newInputReserve = add(inputReserve, inputExtent);
  return harden({ outputExtent, newInputReserve, newOutputReserve });
};

// Calculate how many liquidity tokens we should be minting to send back to the
// user when adding liquidity. Calculations are based on the comparing the
// inputExtent to the inputReserve. If the current supply is zero, just return
// the inputExtent.
export const calcLiqExtentToMint = ({
  liqTokenSupply,
  inputExtent,
  inputReserve,
}) =>
  liqTokenSupply > 0
    ? floorDivide(multiply(inputExtent, liqTokenSupply), inputReserve)
    : inputExtent;

// Calculate how many underlying tokens (in the form of an extent) should be
// returned when removing liquidity.
export const calcExtentToRemove = ({
  liqTokenSupply,
  poolExtent,
  liquidityExtentIn,
}) => floorDivide(multiply(liquidityExtentIn, poolExtent), liqTokenSupply);
