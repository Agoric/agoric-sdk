// @ts-check

import '../../../exported';

import { assert, details as X } from '@agoric/assert';
import { AmountMath } from '@agoric/ertp';
import { isNat } from '@agoric/nat';

import { multiplyBy, makeRatio, natSafeMath } from '../../contractSupport.js';

const { ceilDivide, add, subtract } = natSafeMath;
const BASIS_POINTS = 10000n;

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
  assert(
    isNat(poolFeeBP) && isNat(protocolFeeBP),
    X`poolFee (${poolFeeBP}) and protocolFee (${protocolFeeBP}) must be Nats`,
  );
  const protocolFeeRatio = makeRatio(protocolFeeBP, centralBrand, BASIS_POINTS);
  const halfPoolFeeBP = ceilDivide(poolFeeBP, 2);

  const getPriceGivenAvailableInput = (amountIn, brandOut) => {
    const { brand: brandIn } = amountIn;

    if (isCentral(brandIn) && isSecondary(brandOut)) {
      // we'll subtract the protocol fee from amountIn before sending the
      // remainder to the pool to get a quote. Then we'll add the fee to deltaX
      // before sending out the quote.

      // amountIn will be split into deltaX (what's added to the pool) and the
      // protocol fee. protocolFee will be protocolFeeRatio * deltaX.
      // Therefore, amountIn = (1 + protocolFeeRatio) * deltaX, and
      // protocolFee =  protocolFeeRatio * amountIn / (1 + protocolFeeRatio).
      const feeOverOnePlusFee = makeRatio(
        protocolFeeBP,
        centralBrand,
        add(BASIS_POINTS, protocolFeeBP),
      );
      // TODO(hibbert): use a multiplyBy that rounds up when we have one.
      const protocolFee = multiplyBy(amountIn, feeOverOnePlusFee);
      const poolAmountIn = AmountMath.subtract(amountIn, protocolFee);
      const price = getPool(brandOut).getPriceGivenAvailableInput(
        poolAmountIn,
        brandOut,
        poolFeeBP,
      );

      // price.amountIn is what the user pays, and includes the protocolFee. The
      // user will receive price.amountOut.
      return {
        amountIn: AmountMath.add(price.amountIn, protocolFee),
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
      // deltaY is computed based on deltaX (the amount that will be added to
      // the pool) and the fee. In order to ensure that the poolFee and
      // protocolFee are charged on the same base, we calculate what deltaX
      // would be without a fee. That way both fees are based on the same deltaX
      const { amountOut: noFeeDeltaX } = getPool(
        brandIn,
      ).getPriceGivenAvailableInput(amountIn, brandOut, 0n);
      // TODO(hibbert): use a multiplyBy that rounds up when we have one.
      const protocolFee = multiplyBy(noFeeDeltaX, protocolFeeRatio);
      const amountOutFinal = AmountMath.subtract(price.amountOut, protocolFee);

      // the user pays amountIn, and gets amountOutFinal. The pool pays
      // price.amountOut and gains amountIn
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

      // the protocolFee will be extracted from the central being transferred
      // from brandInPool to brandOutPool. We start by calculating the fee
      // required if amountIn is spent. firstDraftFee will be replaced by
      // actualFee calculated from final central amount.
      const firstDraftFee = multiplyBy(centralAmount, protocolFeeRatio);
      const centralAmountLessFee = AmountMath.subtract(
        centralAmount,
        firstDraftFee,
      );
      // The brandOutPool will get the central amount from brandInPool, less
      // the protocol fee. This gives the amountOut that that would purchase.
      const {
        amountIn: reducedCentralAmount,
        amountOut,
      } = brandOutPool.getPriceGivenAvailableInput(
        centralAmountLessFee,
        brandOut,
        halfPoolFeeBP,
      );
      // Now we know the amountOut that the user will receive, and can ask
      // whether it can be obtained for less.

      // TODO(hibbert): use a multiplyBy that rounds up when we have one.
      const actualFee = multiplyBy(reducedCentralAmount, protocolFeeRatio);
      const reducedCentralPlusFee = AmountMath.add(
        reducedCentralAmount,
        actualFee,
      );
      // brandInPool will receive reducedAmountIn and give up centralAmount. The
      // protocol fee will be calculated from reducedAmountIn.

      // propagate reduced prices back to brandInPool
      const {
        amountIn: reducedAmountIn,
        amountOut: finalCentralAmount,
      } = brandInPool.getPriceGivenRequiredOutput(
        brandIn,
        reducedCentralPlusFee,
        halfPoolFeeBP,
      );

      // the user pays reducedAmountIn, and gains amountOut. brandInPool
      // gains reducedAmountIn, and pays finalCentralAmount + actualFee.
      // brandOutPool gains finalCentralAmount, and pays amountOut.
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
      // The user requested amountOut, which will be paid by the pool as deltaY.
      // user pays deltaX + protocolFee. Pool pays amountOut, gains deltaX.
      const price = getPool(brandOut).getPriceGivenRequiredOutput(
        brandIn,
        amountOut,
        poolFeeBP,
      );

      // TODO(hibbert): use a multiplyBy that rounds up when we have one.
      const protocolFee = multiplyBy(price.amountIn, protocolFeeRatio);
      return {
        amountIn: AmountMath.add(price.amountIn, protocolFee),
        amountOut: price.amountOut,
        protocolFee,
      };
    } else if (isSecondary(brandIn) && isCentral(brandOut)) {
      // The protocolFee is feeRatio * deltaY. deltaY is amountOut + protocolFee
      // protocolFee = amountOut / ((1/feeRatio) - 1)

      // We'll subtract the protocol fee from amountIn to get deltaY. The user
      // will pay deltaY. The Pool gains deltaY, pays amountOut plus protocolFee

      // we compute protocolFee as
      // amountOut * protocolFeeBP / (BASIS_POINTS - protocolFeeBP)
      const protocolFeeMultiplier = makeRatio(
        protocolFeeBP,
        centralBrand,
        subtract(BASIS_POINTS, protocolFeeBP),
      );
      // TODO(hibbert): use a multiplyBy that rounds up when we have one.
      const protocolFee = multiplyBy(amountOut, protocolFeeMultiplier);

      const price = getPool(brandIn).getPriceGivenRequiredOutput(
        brandIn,
        AmountMath.add(amountOut, protocolFee),
        poolFeeBP,
      );

      return {
        amountIn: price.amountIn,
        amountOut: AmountMath.subtract(price.amountOut, protocolFee),
        protocolFee,
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

      // firstCentralAmount will be replaced by finalCentralAmount.  We start by
      // asking how much amountIn is required to buy amountOut.
      const {
        amountIn: firstCentralAmount,
      } = brandOutPool.getPriceGivenRequiredOutput(
        centralBrand,
        amountOut,
        halfPoolFeeBP,
      );

      // protocolFee will be extracted from the central being transferred from
      // brandInPool to brandOutPool. add protocolFee to firstCentralAmount to
      // find amountIn, which the user will pay.
      const {
        amountIn,
        amountOut: finalCentralAmountWithFee,
      } = brandInPool.getPriceGivenRequiredOutput(
        brandIn,
        AmountMath.add(
          firstCentralAmount,
          multiplyBy(firstCentralAmount, protocolFeeRatio),
        ),
        halfPoolFeeBP,
      );

      // propagate improved prices
      // TODO(hibbert): use a multiplyBy that rounds up when we have one.
      const protocolFee = multiplyBy(
        finalCentralAmountWithFee,
        protocolFeeRatio,
      );
      const {
        amountIn: finalCentralAmount,
        amountOut: improvedAmountOut,
      } = brandOutPool.getPriceGivenAvailableInput(
        AmountMath.subtract(finalCentralAmountWithFee, protocolFee),
        brandOut,
        halfPoolFeeBP,
      );

      // The user pays amountIn to brandInPool, and gets improvedAmountOut.
      // brandInPool gets amountIn, and pays finalCentralAmount + protocolFee.
      // brandOutPool gets finalCentralAmount, and pays improvedAmountOut.
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
