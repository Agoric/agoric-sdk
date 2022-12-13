import {
  atomicRearrange,
  fromOnly,
  toOnly,
} from '@agoric/zoe/src/contractSupport/index.js';
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

export const makeSinglePool = ammPowers => ({
  allocateGainsAndLosses: (context, seat, prices) => {
    const { pool } = context.facets;
    const { poolSeat } = context.state;
    const { zcf, protocolSeat } = ammPowers;
    const inBrand = prices.swapperGives.brand;

    /** @type {import('@agoric/zoe/src/contractSupport/atomicTransfer.js').TransferPart[]} */
    const xfer = harden(
      inBrand === getSecondaryBrand(pool)
        ? [
            fromOnly(poolSeat, { Central: prices.yDecrement }),
            toOnly(poolSeat, { Secondary: prices.xIncrement }),
          ]
        : [
            fromOnly(poolSeat, { Secondary: prices.yDecrement }),
            toOnly(poolSeat, { Central: prices.xIncrement }),
          ],
    );

    atomicRearrange(
      zcf,
      harden([
        fromOnly(seat, { In: prices.swapperGives }),

        toOnly(seat, { Out: prices.swapperGets }),
        toOnly(protocolSeat, { Fee: prices.protocolFee }),

        ...xfer,
      ]),
    );
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
    const { params } = ammPowers;
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
    const { params } = ammPowers;
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
