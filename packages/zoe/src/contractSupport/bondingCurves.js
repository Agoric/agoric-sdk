import { assert, details } from '@agoric/assert';
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
 * @param {Object} params
 * @param  {number} params.inputValue - the value of the asset sent
 * in to be swapped
 * @param  {number} params.inputReserve - the value in the liquidity
 * pool of the kind of asset sent in
 * @param  {number} params.outputReserve - the value in the liquidity
 * pool of the kind of asset to be sent out
 * @param  {number} params.feeBasisPoints=30 - the fee taken in
 * basis points. The default is 0.3% or 30 basis points. The fee is taken from
 * inputValue
 * @returns {number} outputValue - the current price, in value form
 */
export const getInputPrice = ({
  inputValue,
  inputReserve,
  outputReserve,
  feeBasisPoints = 30,
}) => {
  const oneMinusFeeInTenThousandths = subtract(10000, feeBasisPoints);
  const inputWithFee = multiply(inputValue, oneMinusFeeInTenThousandths);
  const numerator = multiply(inputWithFee, outputReserve);
  const denominator = add(multiply(inputReserve, 10000), inputWithFee);

  const outputValue = floorDivide(numerator, denominator);
  return outputValue;
};

function assertDefined(label, value) {
  assert(value !== undefined, details`${label} value required`);
}

// Calculate how many liquidity tokens we should be minting to send back to the
// user when adding liquidity. Calculations are based on the comparing the
// inputValue to the inputReserve. If the current supply is zero, just return
// the inputValue.
export const calcLiqValueToMint = ({
  liqTokenSupply,
  inputValue,
  inputReserve,
}) => {
  assertDefined('liqTokenSupply', liqTokenSupply);
  assertDefined('inputValue', inputValue);
  assertDefined('inputReserve', inputReserve);
  return liqTokenSupply > 0
    ? floorDivide(multiply(inputValue, liqTokenSupply), inputReserve)
    : inputValue;
};

// Calculate how many underlying tokens (in the form of a value) should be
// returned when removing liquidity.
export const calcValueToRemove = ({
  liqTokenSupply,
  poolValue,
  liquidityValueIn,
}) => {
  assertDefined('liqTokenSupply', liqTokenSupply);
  assertDefined('liquidityValueIn', liquidityValueIn);
  assertDefined('poolValue', poolValue);

  return floorDivide(multiply(liquidityValueIn, poolValue), liqTokenSupply);
};
