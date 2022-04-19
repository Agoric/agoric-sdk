// @ts-check

// @ts-ignore
import { assertProposalShape } from '@agoric/zoe/src/contractSupport/index.js';

import '@agoric/zoe/exported.js';
// @ts-ignore
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
    if (args) {
      AmountMath.coerce(amountOut.brand, args.maxOut);
      // TODO check that there are no other keys
    }

    const pool = provideVPool(amountIn.brand, amountOut.brand).internalFacet;
    let prices;
    const maxOut = args && args.maxOut;
    if (maxOut) {
      AmountMath.coerce(amountOut.brand, maxOut);
      // @ts-ignore
      prices = pool.getPriceForOutput(amountIn, maxOut);
    }
    if (!prices || !AmountMath.isGTE(prices.swapperGets, maxOut)) {
      // `amountIn` is not enough to sell for maxOut so just sell it all
      // @ts-ignore
      prices = pool.getPriceForInput(amountIn, amountOut);
    }
    assert(amountIn.brand === prices.swapperGives.brand);
    // @ts-ignore
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
