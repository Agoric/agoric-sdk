// @ts-check

import { makeFeeRatio } from '../constantProduct/calcFees';
import {
  pricesForStatedInput,
  pricesForStatedOutput,
} from '../constantProduct/calcSwapPrices.js';

/**
 * @param {ContractFacet} zcf
 * @param {XYKPool} pool
 * @param {BASIS_POINTS} protocolFeeBP - Ratio, soon to be replaced with governed value
 * @param {BASIS_POINTS} poolFeeBP - Ratio, soon to be replaced with governed value
 * @param {ZCFSeat} feeSeat
 * @returns {VPool}
 */
export const makeSinglePool = (
  zcf,
  pool,
  protocolFeeBP,
  poolFeeBP,
  feeSeat,
) => {
  const secondaryBrand = pool.getSecondaryAmount().brand;
  const centralBrand = pool.getCentralAmount().brand;
  const protocolFeeRatio = makeFeeRatio(protocolFeeBP, centralBrand);
  const getPools = () => ({
    Central: pool.getCentralAmount(),
    Secondary: pool.getSecondaryAmount(),
  });
  const publicPrices = prices => {
    return { amountIn: prices.swapperGives, amountOut: prices.swapperGets };
  };

  const allocateGainsAndLosses = (inBrand, prices, seat) => {
    const poolSeat = pool.getPoolSeat();
    seat.decrementBy({ In: prices.swapperGives });
    seat.incrementBy({ Out: prices.swapperGets });
    feeSeat.incrementBy({ RUN: prices.protocolFee });

    if (inBrand === secondaryBrand) {
      poolSeat.incrementBy({ Secondary: prices.xIncrement });
      poolSeat.decrementBy({ Central: prices.yDecrement });
    } else {
      poolSeat.incrementBy({ Central: prices.xIncrement });
      poolSeat.decrementBy({ Secondary: prices.yDecrement });
    }

    zcf.reallocate(poolSeat, seat, feeSeat);
    seat.exit();
    pool.updateState();
    return `Swap successfully completed.`;
  };

  const getPriceForInput = (amountIn, amountOut) => {
    return pricesForStatedInput(
      amountIn,
      getPools(),
      amountOut,
      protocolFeeRatio,
      makeFeeRatio(poolFeeBP, amountOut.brand),
    );
  };

  const swapIn = (seat, amountIn, amountOut) => {
    const prices = getPriceForInput(amountIn, amountOut);
    return allocateGainsAndLosses(amountIn.brand, prices, seat);
  };

  const getPriceForOutput = (amountIn, amountOut) => {
    return pricesForStatedOutput(
      amountIn,
      getPools(),
      amountOut,
      protocolFeeRatio,
      makeFeeRatio(poolFeeBP, amountIn.brand),
    );
  };
  const swapOut = (seat, amountIn, amountOut) => {
    const prices = getPriceForOutput(amountIn, amountOut);
    return allocateGainsAndLosses(amountIn.brand, prices, seat);
  };

  /** @type {VPool} */
  return {
    getInputPrice: (amountIn, amountOut) =>
      publicPrices(getPriceForInput(amountIn, amountOut)),
    getOutputPrice: (amountIn, amountOut) =>
      publicPrices(getPriceForOutput(amountIn, amountOut)),
    swapIn,
    swapOut,
  };
};
