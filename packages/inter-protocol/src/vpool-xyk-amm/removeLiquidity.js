import { assertProposalShape } from '@agoric/zoe/src/contractSupport/index.js';

import '@agoric/zoe/exported.js';

/**
 * @param {ZCF} zcf
 * @param {(brand: Brand) => XYKPool} getPool
 */
export const makeMakeRemoveLiquidityInvitation = (zcf, getPool) => {
  const removeLiquidity = seat => {
    assertProposalShape(seat, {
      want: {
        Central: null,
        Secondary: null,
      },
      give: {
        Liquidity: null,
      },
    });
    // Get the brand of the secondary token so we can identify the liquidity pool.
    const secondaryBrand = seat.getProposal().want.Secondary.brand;
    const pool = getPool(secondaryBrand);
    return pool.removeLiquidity(seat);
  };

  const makeRemoveLiquidityInvitation = () =>
    zcf.makeInvitation(removeLiquidity, 'autoswap remove liquidity');
  return makeRemoveLiquidityInvitation;
};
