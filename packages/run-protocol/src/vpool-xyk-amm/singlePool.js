// @ts-check

import { makeFeeRatio } from './constantProduct/calcFees.js';
import {
  pricesForStatedInput,
  pricesForStatedOutput,
} from './constantProduct/calcSwapPrices.js';

const getSecondaryBrand = pool => pool.getSecondaryAmount().brand;
const getCentralBrand = pool => pool.getCentralAmount().brand;

const getPools = pool => ({
  Central: pool.getCentralAmount(),
  Secondary: pool.getSecondaryAmount(),
});

export const singlePool = {
  allocateGainsAndLosses: (context, seat, prices) => {
    const { pool, helper } = context.facets;
    const { poolSeat, zcf, protocolSeat } = context.state;
    seat.decrementBy(harden({ In: prices.swapperGives }));
    seat.incrementBy(harden({ Out: prices.swapperGets }));
    protocolSeat.incrementBy(harden({ RUN: prices.protocolFee }));

    const inBrand = prices.swapperGives.brand;
    if (inBrand === getSecondaryBrand(pool)) {
      poolSeat.decrementBy(harden({ Central: prices.yDecrement }));
      poolSeat.incrementBy(harden({ Secondary: prices.xIncrement }));
    } else {
      poolSeat.decrementBy(harden({ Secondary: prices.yDecrement }));
      poolSeat.incrementBy(harden({ Central: prices.xIncrement }));
    }

    zcf.reallocate(poolSeat, seat, protocolSeat);
    seat.exit();
    pool.updateState();
    helper.updateMetrics();
    return `Swap successfully completed.`;
  },

  /**
   * @param {import('./pool').MethodContext} context
   * @param {Amount} amountIn
   * @param {Amount} amountOut
   */
  getPriceForInput: ({ state, facets }, amountIn, amountOut) => {
    const { paramAccessor } = state;
    return pricesForStatedInput(
      amountIn,
      getPools(facets.pool),
      amountOut,
      makeFeeRatio(
        paramAccessor.getProtocolFee(),
        getCentralBrand(facets.pool),
      ),
      makeFeeRatio(paramAccessor.getPoolFee(), amountOut.brand),
    );
  },

  /**
   * @param {import('./pool').MethodContext} context
   * @param {Amount} amountIn
   * @param {Amount} amountOut
   */
  getPriceForOutput: ({ state, facets }, amountIn, amountOut) => {
    const { paramAccessor } = state;
    return pricesForStatedOutput(
      amountIn,
      getPools(facets.pool),
      amountOut,
      makeFeeRatio(
        paramAccessor.getProtocolFee(),
        getCentralBrand(facets.pool),
      ),
      makeFeeRatio(paramAccessor.getPoolFee(), amountIn.brand),
    );
  },
};
