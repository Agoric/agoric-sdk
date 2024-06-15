/* eslint @jessie.js/no-nested-await:['error'],curly:['error','all'],eqeqeq:['error','always'],no-bitwise:['error'],no-fallthrough:['error',{commentPattern:'fallthrough is not allowed in Jessie'}],no-restricted-globals:['error','RegExp','Date','Symbol'],no-restricted-syntax:['error',{selector:"BinaryExpression[operator='in']",message:"'in' is not allowed in Jessie"},{selector:"BinaryExpression[operator='instanceof']",message:"'instanceof' is not allowed in Jessie; use duck typing"},{selector:'NewExpression',message:"'new' is not allowed in Jessie; use a 'maker' function"},{selector:'FunctionDeclaration[generator=true]',message:'generators are not allowed in Jessie'},{selector:'FunctionExpression[generator=true]',message:'generators are not allowed in Jessie'},{selector:'DoWhileStatement',message:'do/while statements are not allowed in Jessie'},{selector:'ThisExpression',message:"'this' is not allowed in Jessie; use a closed-over lexical variable instead"},{selector:"UnaryExpression[operator='delete']",message:"'delete' is not allowed in Jessie; destructure objects and reassemble them without mutation"},{selector:'ForInStatement',message:'for/in statements are not allowed in Jessie; use for/of Object.keys(val)'},{selector:"MemberExpression[computed=true][property.type!='Literal'][property.type!='UnaryExpression']",message:"arbitrary computed property names are not allowed in Jessie; use leading '+'"},{selector:"MemberExpression[computed=true][property.type='UnaryExpression'][property.operator!='+']",message:"arbitrary computed property names are not allowed in Jessie; use leading '+'"},{selector:'Super',message:"'super' is not allowed in Jessie"},{selector:'MetaProperty',message:"'import.meta' is not allowed in Jessie"},{selector:'ClassExpression',message:"'class' is not allowed in Jessie; define a 'maker' function"},{selector:'ClassDeclaration',message:"'class' is not allowed in Jessie; define a 'maker' function"},{selector:"CallExpression[callee.name='eval']",message:"'eval' is not allowed in Jessie"},{selector:'Literal[regex]',message:'regexp literal syntax is not allowed in Jessie'}],no-var:['error'],guard-for-in:'off',semi:['error','always'] */ // @jessie-check

import { Nat } from '@endo/nat';
import { Fail } from '@endo/errors';
import { natSafeMath } from './safeMath.js';

const { subtract, add, multiply, floorDivide } = natSafeMath;

const BASIS_POINTS = 10000n; // TODO change to 10_000n once tooling copes.

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
 * @param {any} inputValue - the value of the asset sent
 * in to be swapped
 * @param {any} inputReserve - the value in the liquidity
 * pool of the kind of asset sent in
 * @param {any} outputReserve - the value in the liquidity
 * pool of the kind of asset to be sent out
 * @param {bigint} [feeBasisPoints] - the fee taken in
 * basis points. The default is 0.3% or 30 basis points. The fee
 * is taken from inputValue
 * @returns {NatValue} outputValue - the current price, in value form
 */
export const getInputPrice = (
  inputValue,
  inputReserve,
  outputReserve,
  feeBasisPoints = 30n,
) => {
  inputValue = Nat(inputValue);
  inputReserve = Nat(inputReserve);
  outputReserve = Nat(outputReserve);
  inputValue > 0n || Fail`inputValue ${inputValue} must be positive`;
  inputReserve > 0n || Fail`inputReserve ${inputReserve} must be positive`;
  outputReserve > 0n || Fail`outputReserve ${outputReserve} must be positive`;

  const oneMinusFeeScaled = subtract(BASIS_POINTS, feeBasisPoints);
  const inputWithFee = multiply(inputValue, oneMinusFeeScaled);
  const numerator = multiply(inputWithFee, outputReserve);
  const denominator = add(multiply(inputReserve, BASIS_POINTS), inputWithFee);
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
 * @param {any} outputValue - the value of the asset the user wants
 * to get
 * @param {any} inputReserve - the value in the liquidity
 * pool of the asset being spent
 * @param {any} outputReserve - the value in the liquidity
 * pool of the kind of asset to be sent out
 * @param {bigint} [feeBasisPoints] - the fee taken in
 * basis points. The default is 0.3% or 30 basis points. The fee is taken from
 * outputValue
 * @returns {NatValue} inputValue - the value of input required to purchase output
 */
export const getOutputPrice = (
  outputValue,
  inputReserve,
  outputReserve,
  feeBasisPoints = 30n,
) => {
  outputValue = Nat(outputValue);
  inputReserve = Nat(inputReserve);
  outputReserve = Nat(outputReserve);

  inputReserve > 0n || Fail`inputReserve ${inputReserve} must be positive`;
  outputReserve > 0n || Fail`outputReserve ${outputReserve} must be positive`;
  outputReserve > outputValue ||
    Fail`outputReserve ${outputReserve} must be greater than outputValue ${outputValue}`;

  const oneMinusFeeScaled = subtract(BASIS_POINTS, feeBasisPoints);
  const numerator = multiply(multiply(outputValue, inputReserve), BASIS_POINTS);
  const denominator = multiply(
    subtract(outputReserve, outputValue),
    oneMinusFeeScaled,
  );
  return add(floorDivide(numerator, denominator), 1n);
};

/**
 * Calculate how many liquidity tokens we should be minting to send back to the
 * user when adding liquidity. We provide new liquidity equal to the existing
 * liquidity multiplied by the ratio of new central tokens to central tokens
 * already held. If the current supply is zero, return the inputValue as the
 * initial liquidity to mint is arbitrary.
 *
 * @param {bigint} liqTokenSupply
 * @param {bigint} inputValue
 * @param {bigint} inputReserve
 * @returns {NatValue}
 */
export const calcLiqValueToMint = (
  liqTokenSupply,
  inputValue,
  inputReserve,
) => {
  liqTokenSupply = Nat(liqTokenSupply);
  inputValue = Nat(inputValue);
  inputReserve = Nat(inputReserve);

  if (liqTokenSupply === 0n) {
    return inputValue;
  }
  return floorDivide(multiply(inputValue, liqTokenSupply), inputReserve);
};

/**
 * Calculate how much of the secondary token is required from the user when
 * adding liquidity. We require that the deposited ratio of central to secondary
 * match the current ratio of holdings in the pool.
 *
 * @param {any} centralIn - The value of central assets being deposited
 * @param {any} centralPool - The value of central assets in the pool
 * @param {any} secondaryPool - The value of secondary assets in the pool
 * @param {any} secondaryIn - The value of secondary assets provided. If
 * the pool is empty, the entire amount will be accepted
 * @returns {NatValue} - the amount of secondary required
 */
export const calcSecondaryRequired = (
  centralIn,
  centralPool,
  secondaryPool,
  secondaryIn,
) => {
  centralIn = Nat(centralIn);
  centralPool = Nat(centralPool);
  secondaryPool = Nat(secondaryPool);
  secondaryIn = Nat(secondaryIn);

  if (centralPool === 0n || secondaryPool === 0n) {
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
  return exact ? scaledSecondary : 1n + scaledSecondary;
};

// Calculate how many underlying tokens (in the form of a value) should be
// returned when removing liquidity.
export const calcValueToRemove = (
  liqTokenSupply,
  poolValue,
  liquidityValueIn,
) => {
  liqTokenSupply = Nat(liqTokenSupply);
  liquidityValueIn = Nat(liquidityValueIn);
  poolValue = Nat(poolValue);

  return floorDivide(multiply(liquidityValueIn, poolValue), liqTokenSupply);
};
