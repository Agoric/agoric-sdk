import { atomicTransfer } from '@agoric/zoe/src/contractSupport/index.js';
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

    /** @type {import('@agoric/zoe/src/contractSupport/atomicTransfer.js').TransferArgs} */
    const xfer = harden(
      inBrand === getSecondaryBrand(pool)
        ? [
            poolSeat,
            poolSeat,
            { Central: prices.yDecrement },
            { Secondary: prices.xIncrement },
          ]
        : [
            poolSeat,
            poolSeat,
            { Secondary: prices.yDecrement },
            { Central: prices.xIncrement },
          ],
    );

    atomicTransfer(
      zcf,
      harden([
        [seat, seat, { In: prices.swapperGives }, { Out: prices.swapperGets }],
        // This strange construction is to transfer into without saying at the
        // same time where this amount was transfered from. But the overall
        // atomicTransfer still has to be conserved, i.e., balance to
        // a net zero.
        [undefined, protocolSeat, undefined, { Fee: prices.protocolFee }],
        xfer,
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
