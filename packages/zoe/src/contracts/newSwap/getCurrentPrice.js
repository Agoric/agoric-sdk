// @ts-check

import '../../../exported';

import { assert, details as X } from '@agoric/assert';
import { amountMath } from '@agoric/ertp';
import { multiplyBy, makeRatio, natSafeMath } from '../../contractSupport';

const { ceilDivide } = natSafeMath;
const BASIS_POINTS = 10000;

/**
 * Build functions to calculate prices for multipoolAutoswap. Four methods are
 * returned, as two complementary pairs. In one pair of methods the caller
 * specifies the amount they will pay, and in the other they specify the amount
 * they wish to receive. The two with shorter names (getOutputForGivenInput,
 * getInputForGivenOutput) are consistent with the uniswap interface. They each
 * return a single amount. The other two return { amountIn, centralAmount,
 * amountOut }, which specifies the best exchange consistent with the request.
 * centralAmount is omitted from these methods' results in the publicFacet.
 *
 * @param {(brand: Brand) => boolean} isSecondary
 * @param {(brand: Brand) => boolean} isCentral
 * @param {(brand: Brand) => Pool} getPool
 * @param {Brand} centralBrand
 * @param {bigint} poolFeeBP - fee (BP) to the pool in every swap.
 * @param {bigint} protocolFeeBP - fee (BP) charged in RUN to every swap.
 */

export const makeGetCurrentPrice = (
  isSecondary,
  isCentral,
  getPool,
  centralBrand,
  poolFeeBP,
  protocolFeeBP,
) => {
  const protocolFeeRatio = makeRatio(protocolFeeBP, centralBrand, BASIS_POINTS);
  const halfPoolFeeBP = ceilDivide(poolFeeBP, 2);

  const getPriceGivenAvailableInput = (amountIn, brandOut) => {
    const { brand: brandIn } = amountIn;

    if (isCentral(brandIn) && isSecondary(brandOut)) {
      // we'll charge the protocol fee before sending the remainder to the pool,
      // so we need to subtract it from amountIn before getting a quote, and add
      // it back before sending out the quote.
      const prelimProtocolFee = multiplyBy(amountIn, protocolFeeRatio);
      const poolAmountIn = amountMath.subtract(amountIn, prelimProtocolFee);
      const price = getPool(brandOut).getPriceGivenAvailableInput(
        poolAmountIn,
        brandOut,
        poolFeeBP,
      );
      const protocolFee = multiplyBy(price.amountIn, protocolFeeRatio);
      const amountInFinal = amountMath.add(price.amountIn, protocolFee);

      return {
        amountIn: amountInFinal,
        amountOut: price.amountOut,
        protocolFee,
      };
    } else if (isSecondary(brandIn) && isCentral(brandOut)) {
      // We'll charge the protocol fee after getting the quote
      const price = getPool(brandIn).getPriceGivenAvailableInput(
        amountIn,
        brandOut,
        poolFeeBP,
      );
      const protocolFee = multiplyBy(price.amountOut, protocolFeeRatio);
      const amountOutFinal = amountMath.subtract(price.amountOut, protocolFee);

      return {
        amountIn: price.amountIn,
        amountOut: amountOutFinal,
        protocolFee,
      };
    } else if (isSecondary(brandIn) && isSecondary(brandOut)) {
      // We must do two consecutive getPriceGivenAvailableInput() calls,
      // followed by a call to getPriceGivenRequiredOutput().
      // 1) from amountIn to the central token, which tells us how much central
      // would be provided for amountIn (centralAmount)
      // 2) from centralAmount to brandOut, which tells us how much of brandOut
      // will be provided (amountOut) as well as the minimum price in central
      // tokens (reducedCentralAmount), then finally
      // 3) call getPriceGivenRequiredOutput() to see if the same proceeds can
      // be purchased for less (reducedAmountIn).

      const brandInPool = getPool(brandIn);
      const brandOutPool = getPool(brandOut);
      const {
        amountOut: centralAmount,
      } = brandInPool.getPriceGivenAvailableInput(
        amountIn,
        centralBrand,
        halfPoolFeeBP,
      );

      // firstDraftFee will be replaced by actualFee (from final central amount)
      const firstDraftFee = multiplyBy(centralAmount, protocolFeeRatio);
      const centralAmountLessFee = amountMath.subtract(
        centralAmount,
        firstDraftFee,
      );
      const {
        amountIn: reducedCentralAmount,
        amountOut,
      } = brandOutPool.getPriceGivenAvailableInput(
        centralAmountLessFee,
        brandOut,
        halfPoolFeeBP,
      );

      const actualFee = multiplyBy(reducedCentralAmount, protocolFeeRatio);
      const reducedCentralPlusFee = amountMath.add(
        reducedCentralAmount,
        actualFee,
      );

      // propagate reduced prices back to the first pool
      const {
        amountIn: reducedAmountIn,
        amountOut: finalCentralAmount,
      } = brandInPool.getPriceGivenRequiredOutput(
        brandIn,
        reducedCentralPlusFee,
        halfPoolFeeBP,
      );
      return {
        amountIn: reducedAmountIn,
        amountOut,
        centralAmount: finalCentralAmount,
        protocolFee: actualFee,
      };
    }

    assert.fail(X`brands were not recognized`);
  };

  const getPriceGivenRequiredOutput = (brandIn, amountOut) => {
    const { brand: brandOut } = amountOut;

    if (isCentral(brandIn) && isSecondary(brandOut)) {
      // trader gains amountOut, pays deltaX + protocolFee. Pool pays amountOut,
      // gains deltaX.
      const price = getPool(brandOut).getPriceGivenRequiredOutput(
        brandIn,
        amountOut,
        poolFeeBP,
      );

      const protocolFee = multiplyBy(price.amountIn, protocolFeeRatio);
      return {
        amountIn: amountMath.add(price.amountIn, protocolFee),
        amountOut: price.amountOut,
        protocolFee,
      };
    } else if (isSecondary(brandIn) && isCentral(brandOut)) {
      // trader gets amountOut, pays deltaY. Pool gains deltaY, pays amountOut
      // plus protocolFee
      const preliminaryProtocolFee = multiplyBy(amountOut, protocolFeeRatio);
      const price = getPool(brandIn).getPriceGivenRequiredOutput(
        brandIn,
        amountMath.add(amountOut, preliminaryProtocolFee),
        poolFeeBP,
      );

      return {
        amountIn: price.amountIn,
        amountOut: price.amountOut,
        protocolFee: multiplyBy(price.amountOut, protocolFeeRatio),
      };
    } else if (isSecondary(brandIn) && isSecondary(brandOut)) {
      // We must do two consecutive getPriceGivenRequiredOutput() calls,
      // followed by a call to getPriceGivenAvailableInput().
      // 1) from amountOut to the central token, which tells us how much central
      // is required to obtain amountOut (centralAmount)
      // 2) from centralAmount to brandIn, which tells us how much of brandIn
      // is required (amountIn) as well as the max proceeds in central
      // tokens (improvedCentralAmount), then finally
      // 3) call getPriceGivenAvailableInput() to see if improvedCentralAmount
      // produces a larger amount (improvedAmountOut)

      const brandInPool = getPool(brandIn);
      const brandOutPool = getPool(brandOut);

      // firstCentralAmount will be replaced by finalCentralAmount
      const {
        amountIn: firstCentralAmount,
      } = brandOutPool.getPriceGivenRequiredOutput(
        centralBrand,
        amountOut,
        halfPoolFeeBP,
      );
      const {
        amountIn,
        amountOut: finalCentralAmountWithFee,
      } = brandInPool.getPriceGivenRequiredOutput(
        brandIn,
        amountMath.add(
          firstCentralAmount,
          multiplyBy(firstCentralAmount, protocolFeeRatio),
        ),
        halfPoolFeeBP,
      );

      // propagate improved prices
      const protocolFee = multiplyBy(
        finalCentralAmountWithFee,
        protocolFeeRatio,
      );
      const {
        amountIn: finalCentralAmount,
        amountOut: improvedAmountOut,
      } = brandOutPool.getPriceGivenAvailableInput(
        amountMath.subtract(finalCentralAmountWithFee, protocolFee),
        brandOut,
        halfPoolFeeBP,
      );
      return {
        amountIn,
        amountOut: improvedAmountOut,
        centralAmount: finalCentralAmount,
        protocolFee,
      };
    }

    assert.fail(X`brands were not recognized`);
  };

  /**
   * `getOutputForGivenInput` calculates the result of a trade, given a certain
   * amount of digital assets in.
   *
   * @param {Amount} amountIn - the amount of digital
   * assets to be sent in
   * @param {Brand} brandOut - The brand of asset desired
   * @returns {Amount} the amount that would be paid out at the current price.
   */
  const getOutputForGivenInput = (amountIn, brandOut) => {
    return getPriceGivenAvailableInput(amountIn, brandOut).amountOut;
  };

  /**
   * `getInputForGivenOutput` calculates the amount of assets required to be
   * provided in order to obtain a specified gain.
   *
   * @param {Amount} amountOut - the amount of digital assets desired
   * @param {Brand} brandIn - The brand of asset desired
   * @returns {Amount} The amount required to be paid in order to gain amountOut
   */
  const getInputForGivenOutput = (amountOut, brandIn) => {
    return getPriceGivenRequiredOutput(brandIn, amountOut).amountIn;
  };

  return {
    getOutputForGivenInput,
    getInputForGivenOutput,
    getPriceGivenRequiredOutput,
    getPriceGivenAvailableInput,
  };
};
