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

export const makeSinglePool = ammState => ({
  allocateGainsAndLosses: (context, seat, prices) => {
    const { pool } = context.facets;
    const { poolSeat } = context.state;
    const { zcf, protocolSeat } = ammState;
    seat.decrementBy(harden({ In: prices.swapperGives }));
    seat.incrementBy(harden({ Out: prices.swapperGets }));
    protocolSeat.incrementBy(harden({ Fee: prices.protocolFee }));

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
    return `Swap successfully completed.`;
  },

  /**
   * @param {import('./pool').MethodContext} context
   * @param {Amount} amountIn
   * @param {Amount} amountOut
   */
  getPriceForInput: ({ facets }, amountIn, amountOut) => {
    const { params } = ammState;
    return pricesForStatedInput(
      amountIn,
      getPools(facets.pool),
      amountOut,
      makeFeeRatio(params.getProtocolFee(), getCentralBrand(facets.pool)),
      makeFeeRatio(params.getPoolFee(), amountOut.brand),
    );
  },

  /**
   * @param {import('./pool').MethodContext} context
   * @param {Amount} amountIn
   * @param {Amount} amountOut
   */
  getPriceForOutput: ({ facets }, amountIn, amountOut) => {
    const { params } = ammState;
    return pricesForStatedOutput(
      amountIn,
      getPools(facets.pool),
      amountOut,
      makeFeeRatio(params.getProtocolFee(), getCentralBrand(facets.pool)),
      makeFeeRatio(params.getPoolFee(), amountIn.brand),
    );
  },
});
harden(makeSinglePool);
