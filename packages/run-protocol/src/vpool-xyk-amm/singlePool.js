// @ts-check

import { Far } from '@agoric/marshal';
import { makeFeeRatio } from './constantProduct/calcFees';
import {
  pricesForStatedInput,
  pricesForStatedOutput,
} from './constantProduct/calcSwapPrices.js';

/**
 * @param {ContractFacet} zcf
 * @param {XYKPool} pool
 * @param {() => bigint} getProtocolFeeBP - retrieve governed protocol fee value
 * @param {() => bigint} getPoolFeeBP - retrieve governed pool fee value
 * @param {ZCFSeat} feeSeat
 * @returns {VPool}
 */
export const makeSinglePool = (
  zcf,
  pool,
  getProtocolFeeBP,
  getPoolFeeBP,
  feeSeat,
) => {
  const secondaryBrand = pool.getSecondaryAmount().brand;
  const centralBrand = pool.getCentralAmount().brand;
  const getPools = () => ({
    Central: pool.getCentralAmount(),
    Secondary: pool.getSecondaryAmount(),
  });
  const publicPrices = prices => ({
    amountIn: prices.swapperGives,
    amountOut: prices.swapperGets,
  });

  const allocateGainsAndLosses = (inBrand, prices, seat) => {
    const poolSeat = pool.getPoolSeat();
    seat.decrementBy(harden({ In: prices.swapperGives }));
    seat.incrementBy(harden({ Out: prices.swapperGets }));
    feeSeat.incrementBy(harden({ RUN: prices.protocolFee }));

    if (inBrand === secondaryBrand) {
      poolSeat.incrementBy(harden({ Secondary: prices.xIncrement }));
      poolSeat.decrementBy(harden({ Central: prices.yDecrement }));
    } else {
      poolSeat.incrementBy(harden({ Central: prices.xIncrement }));
      poolSeat.decrementBy(harden({ Secondary: prices.yDecrement }));
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
      makeFeeRatio(getProtocolFeeBP(), centralBrand),
      makeFeeRatio(getPoolFeeBP(), amountOut.brand),
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
      makeFeeRatio(getProtocolFeeBP(), centralBrand),
      makeFeeRatio(getPoolFeeBP(), amountIn.brand),
    );
  };
  const swapOut = (seat, amountIn, amountOut) => {
    const prices = getPriceForOutput(amountIn, amountOut);
    return allocateGainsAndLosses(amountIn.brand, prices, seat);
  };

  /** @type {VPool} */
  return Far('single pool', {
    getInputPrice: (amountIn, amountOut) =>
      publicPrices(getPriceForInput(amountIn, amountOut)),
    getOutputPrice: (amountIn, amountOut) =>
      publicPrices(getPriceForOutput(amountIn, amountOut)),
    swapIn,
    swapOut,
  });
};
