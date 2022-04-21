// @ts-check

import { Far } from '@endo/marshal';
import { makeFeeRatio } from './constantProduct/calcFees.js';
import {
  pricesForStatedInput,
  pricesForStatedOutput,
} from './constantProduct/calcSwapPrices.js';

/**
 * @param {ZCF} zcf
 * @param {() => bigint} getProtocolFeeBP - retrieve governed protocol fee value
 * @param {() => bigint} getPoolFeeBP - retrieve governed pool fee value
 * @param {ZCFSeat} feeSeat
 */
export const makeSinglePool = (
  zcf,
  getProtocolFeeBP,
  getPoolFeeBP,
  feeSeat,
) => {
  const getSecondaryBrand = pool => pool.getSecondaryAmount().brand;
  const getCentralBrand = pool => pool.getCentralAmount().brand;

  const getPools = pool => ({
    Central: pool.getCentralAmount(),
    Secondary: pool.getSecondaryAmount(),
  });

  const publicPrices = prices => ({
    amountIn: prices.swapperGives,
    amountOut: prices.swapperGets,
  });

  const allocateGainsAndLosses = (pool, prices, seat) => {
    const poolSeat = pool.getPoolSeat();
    seat.decrementBy(harden({ In: prices.swapperGives }));
    seat.incrementBy(harden({ Out: prices.swapperGets }));
    feeSeat.incrementBy(harden({ RUN: prices.protocolFee }));

    const inBrand = prices.swapperGives.brand;
    if (inBrand === getSecondaryBrand(pool)) {
      poolSeat.decrementBy(harden({ Central: prices.yDecrement }));
      poolSeat.incrementBy(harden({ Secondary: prices.xIncrement }));
    } else {
      poolSeat.decrementBy(harden({ Secondary: prices.yDecrement }));
      poolSeat.incrementBy(harden({ Central: prices.xIncrement }));
    }

    zcf.reallocate(poolSeat, seat, feeSeat);
    seat.exit();
    pool.updateState();
    return `Swap successfully completed.`;
  };

  /**
   * @param {import('./pool').MethodContext} context
   * @param {Amount} amountIn
   * @param {Amount} amountOut
   */
  const getPriceForInput = (context, amountIn, amountOut) => {
    return pricesForStatedInput(
      amountIn,
      getPools(context.facets.pool),
      amountOut,
      makeFeeRatio(getProtocolFeeBP(), getCentralBrand(context.facets.pool)),
      makeFeeRatio(getPoolFeeBP(), amountOut.brand),
    );
  };

  /**
   * @param {import('./pool').MethodContext} context
   * @param {ZCFSeat} seat
   * @param {Amount} amountIn
   * @param {Amount} amountOut
   */
  const swapIn = (context, seat, amountIn, amountOut) => {
    const prices = getPriceForInput(context, amountIn, amountOut);
    return allocateGainsAndLosses(context.facets.pool, prices, seat);
  };

  /**
   * @param {import('./pool').MethodContext} context
   * @param {Amount} amountIn
   * @param {Amount} amountOut
   */
  const getPriceForOutput = (context, amountIn, amountOut) => {
    return pricesForStatedOutput(
      amountIn,
      getPools(context.facets.pool),
      amountOut,
      makeFeeRatio(getProtocolFeeBP(), getCentralBrand(context.facets.pool)),
      makeFeeRatio(getPoolFeeBP(), amountIn.brand),
    );
  };

  /**
   * @param {import('./pool').MethodContext} context
   * @param {ZCFSeat} seat
   * @param {Amount} amountIn
   * @param {Amount} amountOut
   */
  const swapOut = (context, seat, amountIn, amountOut) => {
    const prices = getPriceForOutput(context, amountIn, amountOut);
    return allocateGainsAndLosses(context.facets.pool, prices, seat);
  };

  const externalFacet = Far('single pool', {
    getInputPrice: (context, amountIn, amountOut) =>
      publicPrices(getPriceForInput(context, amountIn, amountOut)),
    getOutputPrice: (context, amountIn, amountOut) =>
      publicPrices(getPriceForOutput(context, amountIn, amountOut)),
    swapIn,
    swapOut,
  });

  const internalFacet = Far('single pool', {
    getPriceForInput,
    getPriceForOutput,
    allocateGainsAndLosses,
  });

  return { externalFacet, internalFacet };
};
