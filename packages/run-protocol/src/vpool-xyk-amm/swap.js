// @ts-check

import { assertProposalShape } from '@agoric/zoe/src/contractSupport/index.js';

import '@agoric/zoe/exported.js';
import { AmountMath } from '@agoric/ertp';

/**
 * @param {ZCF} zcf
 * @param {(brandIn: Brand, brandOut: Brand) => VPoolWrapper<unknown>} provideVPool
 */
export const makeMakeSwapInvitation = (zcf, provideVPool) => {
  // trade with a stated amountIn.
  const swapIn = (seat, { maxOut } = {}) => {
    assertProposalShape(seat, {
      give: { In: null },
      want: { Out: null },
    });
    const {
      give: { In: amountIn },
      want: { Out: amountOut },
    } = seat.getProposal();
    // const pool = provideVPool(amountIn.brand, amountOut.brand).externalFacet;
    // return pool.swapIn(seat, amountIn, amountOut);
    console.log('start trade', { amountIn, amountOut, maxOut });
    const pool = provideVPool(amountIn.brand, amountOut.brand).internalFacet;
    let prices;
    if (maxOut) {
      AmountMath.coerce(amountOut.brand, maxOut);
      prices = pool.getPriceForOutput(amountIn, maxOut);
      console.log('had maxOut', maxOut, prices);
    }
    if (!prices || !AmountMath.isGTE(prices.swapperGets, maxOut)) {
      // `amountIn` is not enough to sell for maxOut so just sell it all
      prices = pool.getPriceForInput(amountIn, amountOut);
      console.log('just swap in', prices);
    }
    console.log('HELP', prices);
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
