// @ts-check

import { assertProposalShape } from '../../contractSupport';

import '../../../exported';

/**
 * @param {ContractFacet} zcf
 * @param {(brand: Brand) => Pool} getPool
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
