import { assertProposalKeywords } from '../../contractSupport';

import '../../../exported';

/**
 * @param {ContractFacet} zcf
 * @param {(brand: Brand) => Pool} getPool
 */
export const makeMakeRemoveLiquidityInvitation = (zcf, getPool) => {
  const removeLiquidityExpected = harden({
    want: {
      Central: null,
      Secondary: null,
    },
    give: {
      Liquidity: null,
    },
  });

  const removeLiquidity = seat => {
    // Get the brand of the secondary token so we can identify the liquidity pool.
    const secondaryBrand = seat.getProposal().want.Secondary.brand;
    const pool = getPool(secondaryBrand);
    return pool.removeLiquidity(seat);
  };

  const makeRemoveLiquidityInvitation = () =>
    zcf.makeInvitation(
      assertProposalKeywords(removeLiquidity, removeLiquidityExpected),
      'autoswap remove liquidity',
    );
  return makeRemoveLiquidityInvitation;
};
