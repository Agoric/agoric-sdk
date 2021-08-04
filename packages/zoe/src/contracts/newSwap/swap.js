// @ts-check

import { assert, details as X } from '@agoric/assert';
import { AmountMath } from '@agoric/ertp';

import { assertProposalShape } from '../../contractSupport/index.js';

import '../../../exported.js';

const SUCCESS_STRING = `Swap successfully completed.`;

/**
 * @param {ContractFacet} zcf
 * @param {(brand: Brand) => boolean} isSecondary
 * @param {(brand: Brand) => boolean} isCentral
 * @param {(brand: Brand) => Pool} getPool
 * @param {(amountIn, brandOut) => SwapPriceQuote} getPriceGivenAvailableInput
 * @param {(brandIn, amountOut) => SwapPriceQuote} getPriceGivenRequiredOutput
 * @param {ZCFSeat} protocolSeat
 */
export const makeMakeSwapInvitation = (
  zcf,
  isSecondary,
  isCentral,
  getPool,
  getPriceGivenAvailableInput,
  getPriceGivenRequiredOutput,
  protocolSeat,
) => {
  const reallocateCentralToSecondary = (
    seat,
    protocolFee,
    amountIn,
    amountOut,
  ) => {
    const pool = getPool(amountOut.brand);
    const poolSeat = pool.getPoolSeat();

    // Transfer amountIn from the user
    seat.decrementBy({ In: amountIn });
    poolSeat.incrementBy({ Central: amountIn });

    // Transfer protocolFee

    // TODO: this should be transferred directly from the user such
    // that there's no way to accidentally take more than expected
    // from the pool.
    poolSeat.decrementBy({ Central: protocolFee });
    protocolSeat.incrementBy({ RUN: protocolFee });

    // Transfer amountOut from the pool
    poolSeat.decrementBy({ Secondary: amountOut });
    seat.incrementBy({ Out: amountOut });

    zcf.reallocate(poolSeat, seat, protocolSeat);
    seat.exit();
    pool.updateState();
  };

  const reallocateSecondaryToCentral = (
    seat,
    protocolFee,
    amountIn,
    amountOut,
  ) => {
    const pool = getPool(amountIn.brand);
    const poolSeat = pool.getPoolSeat();

    // Transfer amountIn from the user
    seat.decrementBy({ In: amountIn });
    poolSeat.incrementBy({ Secondary: amountIn });

    // Transfer amountOut from the pool
    poolSeat.decrementBy({ Central: amountOut });
    seat.incrementBy({ Out: amountOut });

    // Transfer protocolFee
    poolSeat.decrementBy({ Central: protocolFee });
    protocolSeat.incrementBy({ RUN: protocolFee });

    zcf.reallocate(poolSeat, seat, protocolSeat);
    seat.exit();
    pool.updateState();
  };

  const reallocateSecondaryToSecondary = (
    seat,
    protocolFee,
    amountIn,
    amountOut,
    centralAmount,
  ) => {
    const brandInPool = getPool(amountIn.brand);
    const brandInPoolSeat = brandInPool.getPoolSeat();

    const brandOutPool = getPool(amountOut.brand);
    const brandOutPoolSeat = brandOutPool.getPoolSeat();

    // Transfer amountIn from the user
    seat.decrementBy({ In: amountIn });
    brandInPoolSeat.incrementBy({ Secondary: amountIn });

    // Transfer protocolFee from the brandInPool

    // Note: the protocolFee is effectively shared between the
    // brandInPool and the brandOutPool. We subtract the protocolFee
    // from brandInPool directly, and we subtract more value from
    // brandOutPool than we otherwise would, thus taking part of the
    // fee from brandOutPool too.
    brandInPoolSeat.decrementBy({ Central: protocolFee });
    protocolSeat.incrementBy({ RUN: protocolFee });

    // Transfer Central between pools
    brandInPoolSeat.decrementBy({ Central: centralAmount });
    brandOutPoolSeat.incrementBy({ Central: centralAmount });

    // Transfer amountOut from the pool
    brandOutPoolSeat.decrementBy({ Secondary: amountOut });
    seat.incrementBy({ Out: amountOut });

    zcf.reallocate(brandInPoolSeat, brandOutPoolSeat, seat, protocolSeat);
    seat.exit();
    brandInPool.updateState();
    brandOutPool.updateState();
  };

  const reallocate = (
    seat,
    { protocolFee, amountIn, amountOut, centralAmount },
  ) => {
    // central to secondary, secondary to central, or secondary to secondary
    if (isCentral(amountIn.brand) && isSecondary(amountOut.brand)) {
      reallocateCentralToSecondary(seat, protocolFee, amountIn, amountOut);
    } else if (isSecondary(amountIn.brand) && isCentral(amountOut.brand)) {
      reallocateSecondaryToCentral(seat, protocolFee, amountIn, amountOut);
    } else if (isSecondary(amountIn.brand) && isSecondary(amountOut.brand)) {
      reallocateSecondaryToSecondary(
        seat,
        protocolFee,
        amountIn,
        amountOut,
        centralAmount,
      );
    } else {
      assert.fail(X`brands were not recognized`);
    }
  };

  const doSwap = (seat, getPriceFn) => {
    assertProposalShape(seat, {
      give: { In: null },
      want: { Out: null },
    });
    const {
      give: { In: amountIn },
      want: { Out: amountOut },
    } = seat.getProposal();

    const prices = getPriceFn(amountIn, amountOut);

    const amountInCoversCosts = AmountMath.isGTE(amountIn, prices.amountIn);

    if (!amountInCoversCosts) {
      const reason = `offeredAmountIn ${amountIn} is insufficient to buy amountOut ${amountOut}. ${prices.amountIn} is required.`;
      throw seat.fail(Error(reason));
    }
    reallocate(seat, prices);
    return SUCCESS_STRING;
  };

  const swapIn = seat => {
    const getPriceFn = (amountIn, amountOut) => {
      return getPriceGivenAvailableInput(amountIn, amountOut.brand);
    };
    return doSwap(seat, getPriceFn);
  };

  const swapOut = seat => {
    const getPriceFn = (amountIn, amountOut) => {
      return getPriceGivenRequiredOutput(amountIn.brand, amountOut);
    };
    return doSwap(seat, getPriceFn);
  };

  const makeSwapInInvitation = () =>
    zcf.makeInvitation(swapIn, 'autoswap swapIn');

  const makeSwapOutInvitation = () =>
    zcf.makeInvitation(swapOut, 'autoswap swapOut');

  return { makeSwapInInvitation, makeSwapOutInvitation };
};
