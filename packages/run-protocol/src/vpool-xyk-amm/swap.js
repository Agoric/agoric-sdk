// @ts-check

import { assertProposalShape } from '@agoric/zoe/src/contractSupport/index.js';

import '@agoric/zoe/exported.js';
import { AmountMath } from '@agoric/ertp';

/**
 * @param {ZCF} zcf
 * @param {(brandIn: Brand, brandOut: Brand) => VPoolWrapper<DoublePoolInternalFacet>} provideVPool
 */
export const makeMakeSwapInvitation = (zcf, provideVPool) => {
  /**
   * trade with a stated amountIn.
   *
   * @param {ZCFSeat} seat
   * @param {{ maxOut: Amount }} args
   */
  const swapIn = (seat, args) => {
    assertProposalShape(seat, {
      give: { In: null },
      want: { Out: null },
    });
    const {
      give: { In: amountIn },
      want: { Out: amountOut },
    } = seat.getProposal();
    const pool = provideVPool(amountIn.brand, amountOut.brand).internalFacet;
    let prices;
    const maxOut = args.maxOut;
    if (maxOut) {
      AmountMath.coerce(amountOut.brand, maxOut);
      prices = pool.getPriceForOutput(amountIn, maxOut);
    }
    if (!prices || !AmountMath.isGTE(prices.swapperGets, maxOut)) {
      // `amountIn` is not enough to sell for maxOut so just sell it all
      prices = pool.getPriceForInput(amountIn, amountOut);
    }
    assert(amountIn.brand === prices.swapperGives.brand);
    return pool.allocateGainsAndLosses(seat, prices);
  };

  // trade with a stated amount out.
  const swapOut = seat => {
    // The offer's amountOut is a minimum; the offeredAmountIn is a max.
    const {
      want: { Out: maxOut },
    } = seat.getProposal();
    return swapIn(seat, { maxOut });
  };

  const makeSwapInInvitation = () =>
    zcf.makeInvitation(swapIn, 'autoswap swapIn');

  const makeSwapOutInvitation = () =>
    zcf.makeInvitation(swapOut, 'autoswap swapOut');

  return { makeSwapInInvitation, makeSwapOutInvitation };
};
