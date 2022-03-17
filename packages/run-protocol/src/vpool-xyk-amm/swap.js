// @ts-check

import { assertProposalShape } from '@agoric/zoe/src/contractSupport/index.js';

import '@agoric/zoe/exported.js';

/**
 * @param {ZCF} zcf
 * @param {(brandIn: Brand, brandOut: Brand) => VPoolWrapper<unknown>} provideVPool
 */
export const makeMakeSwapInvitation = (zcf, provideVPool) => {
  // trade with a stated amountIn.
  const swapIn = seat => {
    assertProposalShape(seat, {
      give: { In: null },
      want: { Out: null },
    });
    const {
      give: { In: amountIn },
      want: { Out: amountOut },
    } = seat.getProposal();
    const pool = provideVPool(amountIn.brand, amountOut.brand).externalFacet;
    return pool.swapIn(seat, amountIn, amountOut);
  };

  // trade with a stated amount out.
  const swapOut = seat => {
    assertProposalShape(seat, {
      give: { In: null },
      want: { Out: null },
    });
    // The offer's amountOut is a minimum; the offeredAmountIn is a max.
    const {
      give: { In: amountIn },
      want: { Out: amountOut },
    } = seat.getProposal();
    const pool = provideVPool(amountIn.brand, amountOut.brand).externalFacet;
    return pool.swapOut(seat, amountIn, amountOut);
  };

  const makeSwapInInvitation = () =>
    zcf.makeInvitation(swapIn, 'autoswap swapIn');

  const makeSwapOutInvitation = () =>
    zcf.makeInvitation(swapOut, 'autoswap swapOut');

  return { makeSwapInInvitation, makeSwapOutInvitation };
};
