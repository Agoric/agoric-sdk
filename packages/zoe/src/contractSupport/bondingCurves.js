import { assert, details } from '@agoric/assert';
import { natSafeMath } from './safeMath';

const { add, subtract, multiply, floorDivide } = natSafeMath;
/**
 * Calculations for constant product markets like Uniswap.
 * https://github.com/runtimeverification/verified-smart-contracts/blob/uniswap/uniswap/x-y-k.pdf
 */

/**
 * Contains the logic for calculating how much should be given
 * back to the user in exchange for what they sent in. Reused in
 * several different places, including to check whether an offer
 * is valid, getting the current price for an asset on user
 * request, and to do the actual reallocation after an offer has
 * been made.
 *
 * @param {number} inputValue - the value of the asset sent
 * in to be swapped
 * @param {number} inputReserve - the value in the liquidity
 * pool of the kind of asset sent in
 * @param {number} outputReserve - the value in the liquidity
 * pool of the kind of asset to be sent out
 * @param {number} [feeBasisPoints=30] - the fee taken in
 * basis points. The default is 0.3% or 30 basis points. The fee
 * is taken from inputValue
 * @returns {number} outputValue - the current price, in value form
 */
export const getInputPrice = (
  inputValue,
  inputReserve,
  outputReserve,
  feeBasisPoints = 30,
) => {
  const oneMinusFeeInTenThousandths = subtract(10000, feeBasisPoints);
  const inputWithFee = multiply(inputValue, oneMinusFeeInTenThousandths);
  const numerator = multiply(inputWithFee, outputReserve);
  const denominator = add(multiply(inputReserve, 10000), inputWithFee);

  return floorDivide(numerator, denominator);
};

/**
 * Contains the logic for calculating how much should be taken
 * from the user in exchange for what they want to obtain. Reused in
 * several different places, including to check whether an offer
 * is valid, getting the current price for an asset on user
 * request, and to do the actual reallocation after an offer has
 * been made.
 *
 * @param {number} outputValue - the value of the asset the user wants
 * to get
 * @param {number} inputReserve - the value in the liquidity
 * pool of the asset being spent
 * @param {number} outputReserve - the value in the liquidity
 * pool of the kind of asset to be sent out
 * @param {number} [feeBasisPoints=30] - the fee taken in
 * basis points. The default is 0.3% or 30 basis points. The fee is taken from
 * outputValue
 * @returns {number} inputValue - the value of input required to purchase output
 */
export const getOutputPrice = (
  outputValue,
  inputReserve,
  outputReserve,
  feeBasisPoints = 30,
) => {
  const oneMinusFeeInTenThousandths = subtract(10000, feeBasisPoints);
  const numerator = multiply(multiply(outputValue, inputReserve), 10000);
  const denominator = multiply(
    subtract(outputReserve, outputValue),
    oneMinusFeeInTenThousandths,
  );

  return floorDivide(numerator, denominator);
};

function assertDefined(label, value) {
  assert(value !== undefined, details`${label} value required`);
}

// Calculate how many liquidity tokens we should be minting to send back to the
// user when adding liquidity. We provide new liquidity equal to the existing
// liquidity multiplied by the ratio of new central tokens to central tokens
// already held. If the current supply is zero, return the inputValue as the
// initial liquidity to mint is arbitrary.
export const calcLiqValueToMint = (
  liqTokenSupply,
  inputValue,
  inputReserve,
) => {
  assertDefined('liqTokenSupply', liqTokenSupply);
  assertDefined('inputValue', inputValue);
  assertDefined('inputReserve', inputReserve);

  if (liqTokenSupply === 0) {
    return inputValue;
  }
  return floorDivide(multiply(inputValue, liqTokenSupply), inputReserve);
};

/**
 * Calculate how much of the secondary token is required from the user when
 * adding liquidity. We require that the deposited ratio of central to secondary
 * match the current ratio of holdings in the pool.
 *
 * @param {number} centralIn - The value of central assets being deposited
 * @param {number} centralPool - The value of central assets in the pool
 * @param {number} secondaryPool - The value of secondary assets in the pool
 * @param {number} secondaryIn - The value of secondary assets provided. If
 * the pool is empty, the entire amount will be accepted
 * @returns {number} - the amount of secondary required
 */
export const calcSecondaryRequired = (
  centralIn,
  centralPool,
  secondaryPool,
  secondaryIn,
) => {
  assertDefined('centralIn', centralIn);
  assertDefined('centralPool', centralPool);
  assertDefined('secondaryReserve', secondaryPool);
  if (centralPool === 0 || secondaryPool === 0) {
    return secondaryIn;
  }

  const scaledSecondary = floorDivide(
    multiply(centralIn, secondaryPool),
    centralPool,
  );
  const exact =
    multiply(centralIn, secondaryPool) ===
    multiply(scaledSecondary, centralPool);

  // doesn't match the x-y-k.pdf paper, but more correct. When the ratios are
  // exactly equal, lPrime is exactly l * (1 + alpha) and adding one is wrong
  return exact ? scaledSecondary : 1 + scaledSecondary;
};

// Calculate how many underlying tokens (in the form of a value) should be
// returned when removing liquidity.
export const calcValueToRemove = (
  liqTokenSupply,
  poolValue,
  liquidityValueIn,
) => {
  assertDefined('liqTokenSupply', liqTokenSupply);
  assertDefined('liquidityValueIn', liquidityValueIn);
  assertDefined('poolValue', poolValue);

  return floorDivide(multiply(liquidityValueIn, poolValue), liqTokenSupply);
};
