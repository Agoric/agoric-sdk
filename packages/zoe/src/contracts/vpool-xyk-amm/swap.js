// @ts-check

import { assertProposalShape } from '../../contractSupport/index.js';

import '../../../exported.js';
import { LOW_FEE, SHORT_EXP } from '../../constants.js';

/**
 * @param {ContractFacet} zcf
 * @param {(brandIn: Brand, brandOut: Brand, fee: bigint) => VPool} provideVPool
 * @param {bigint} poolFee
 */
export const makeMakeSwapInvitation = (zcf, provideVPool, poolFee) => {
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
    const pool = provideVPool(amountIn.brand, amountOut.brand, poolFee);
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
    const pool = provideVPool(amountIn.brand, amountOut.brand, poolFee);
    return pool.swapOut(seat, amountIn, amountOut);
  };

  const makeSwapInInvitation = () =>
    zcf.makeInvitation(
      swapIn,
      'autoswap swapIn',
      undefined,
      LOW_FEE,
      SHORT_EXP,
    );

  const makeSwapOutInvitation = () =>
    zcf.makeInvitation(
      swapOut,
      'autoswap swapOut',
      undefined,
      LOW_FEE,
      SHORT_EXP,
    );

  return { makeSwapInInvitation, makeSwapOutInvitation };
};
